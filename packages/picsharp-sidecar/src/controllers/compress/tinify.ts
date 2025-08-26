import { Hono } from 'hono';
import { createReadStream, createWriteStream } from 'node:fs';
import { copyFile } from 'node:fs/promises';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  calCompressionRate,
  checkFile,
  createOutputPath,
  copyFileToTemp,
  isValidArray,
  hashFile,
} from '../../utils';
import { SaveMode, ConvertFormat } from '../../constants';
import { request } from 'undici';
import { pipeline } from 'node:stream/promises';
import { bulkConvert } from '../../services/convert';
const app = new Hono();

const OptionsSchema = z
  .object({
    limit_compress_rate: z.number().min(0).max(1).optional(),
    save: z
      .object({
        mode: z.nativeEnum(SaveMode).optional().default(SaveMode.Overwrite),
        new_file_suffix: z.string().optional().default('_compressed'),
        new_folder_path: z.string().optional(),
      })
      .optional()
      .default({}),
    temp_dir: z.string().optional(),
    convert_types: z.array(z.nativeEnum(ConvertFormat)).optional().default([]),
    convert_alpha: z.string().optional().default('#FFFFFF'),
  })
  .optional()
  .default({});

const ProcessOptionsSchema = z
  .object({
    api_key: z.string(),
    mime_type: z.string(),
    preserveMetadata: z.array(z.string()).optional(),
  })
  .optional()
  .default({
    api_key: '',
    mime_type: '',
  });

const PayloadSchema = z.object({
  input_path: z.string(),
  options: OptionsSchema,
  process_options: ProcessOptionsSchema,
});

const API_ENDPOINT = 'https://api.tinify.com';

interface TinifyResult {
  input: {
    size: number;
    type: string;
  };
  output: {
    width: number;
    height: number;
    ratio: number;
    size: number;
    type: string;
    url: string;
  };
}

app.post('/', zValidator('json', PayloadSchema), async (context) => {
  let { input_path, options, process_options } =
    await context.req.json<z.infer<typeof PayloadSchema>>();
  await checkFile(input_path);
  options = OptionsSchema.parse(options);
  process_options = ProcessOptionsSchema.parse(process_options);

  const response = await request<TinifyResult>(`${API_ENDPOINT}/shrink`, {
    method: 'POST',
    headers: {
      'Content-Type': process_options.mime_type,
      Authorization: `Basic ${btoa(`api:${process_options.api_key}`)}`,
    },
    body: createReadStream(input_path),
  });

  const data = (await response.body?.json()) as TinifyResult;
  const compressRatio = calCompressionRate(data.input.size, data.output.size);

  const availableCompressRate = compressRatio >= (options.limit_compress_rate || 0);

  const newOutputPath = await createOutputPath(input_path, {
    mode: options.save.mode,
    new_file_suffix: options.save.new_file_suffix,
    new_folder_path: options.save.new_folder_path,
  });

  const tempFilePath = options.temp_dir ? await copyFileToTemp(input_path, options.temp_dir) : '';
  if (availableCompressRate) {
    const body: Record<string, any> = {};
    if (isValidArray(process_options.preserveMetadata)) {
      body.preserve = process_options.preserveMetadata;
    }
    const response = await request(data.output.url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${btoa(`api:${process_options.api_key}`)}`,
      },
      body: JSON.stringify(body),
    });
    await pipeline(response.body, createWriteStream(newOutputPath));
  } else {
    if (input_path !== newOutputPath) {
      await copyFile(input_path, newOutputPath);
    }
  }

  const result: Record<string, any> = {
    input_path,
    input_size: data.input.size,
    output_path: newOutputPath,
    output_size: availableCompressRate ? data.output.size : data.input.size,
    compression_rate: availableCompressRate ? compressRatio : 0,
    original_temp_path: tempFilePath,
    available_compress_rate: availableCompressRate,
    hash: await hashFile(input_path),
    debug: {
      compressedSize: data.output.size,
      compressionRate: newOutputPath,
      options,
      process_options,
    },
  };

  if (isValidArray(options.convert_types)) {
    const results = await bulkConvert(newOutputPath, options.convert_types, options.convert_alpha);
    result.convert_results = results;
  }

  return context.json(result);
});

export default app;
