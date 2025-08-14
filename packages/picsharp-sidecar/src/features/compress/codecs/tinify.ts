import { createReadStream, createWriteStream } from 'node:fs';
import { copyFile } from 'node:fs/promises';
import { request } from 'undici';
import { pipeline } from 'node:stream/promises';
import {
  calCompressionRate,
  checkFile,
  createOutputPath,
  copyFileToTemp,
  isValidArray,
  hashFile,
} from '../../../utils';
import { SaveMode } from '../../../constants';
import { ConvertFormat, bulkConvert } from '../../../services/convert';

export interface TinifyOptions {
  limit_compress_rate?: number;
  save?: {
    mode?: SaveMode;
    new_file_suffix?: string;
    new_folder_path?: string;
  };
  temp_dir?: string;
  convert_types?: ConvertFormat[];
  convert_alpha?: string;
}

export interface TinifyProcessOptions {
  api_key: string;
  mime_type: string;
  preserveMetadata?: string[];
}

interface TinifyResult {
  input: { size: number; type: string };
  output: { width: number; height: number; ratio: number; size: number; type: string; url: string };
}

export async function handleTinify(
  payload: {
    codec: 'tinify';
    inputPath: string;
    options: TinifyOptions;
    processOptions: TinifyProcessOptions;
  },
  onProgress?: (stage: 'starting' | 'processing' | 'writing' | 'converting' | 'completed') => void,
) {
  const { inputPath, options, processOptions } = payload;
  await checkFile(inputPath);

  onProgress?.('starting');
  const response = await request<TinifyResult>(`https://api.tinify.com/shrink`, {
    method: 'POST',
    headers: {
      'Content-Type': processOptions.mime_type,
      Authorization: `Basic ${Buffer.from(`api:${processOptions.api_key}`).toString('base64')}`,
    },
    body: createReadStream(inputPath),
  });

  const data = (await response.body?.json()) as TinifyResult;
  const compressRatio = calCompressionRate(data.input.size, data.output.size);
  const availableCompressRate = compressRatio >= (options.limit_compress_rate || 0);

  const newOutputPath = await createOutputPath(inputPath, {
    mode: options.save?.mode ?? SaveMode.Overwrite,
    new_file_suffix: options.save?.new_file_suffix ?? '_compressed',
    new_folder_path: options.save?.new_folder_path,
  });

  const tempFilePath = options.temp_dir ? await copyFileToTemp(inputPath, options.temp_dir) : '';

  onProgress?.('writing');
  if (availableCompressRate) {
    const body: Record<string, any> = {};
    if (isValidArray(processOptions.preserveMetadata)) {
      body.preserve = processOptions.preserveMetadata;
    }
    const resp = await request(data.output.url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`api:${processOptions.api_key}`).toString('base64')}`,
      },
      body: JSON.stringify(body),
    });
    await pipeline(resp.body, createWriteStream(newOutputPath));
  } else {
    if (inputPath !== newOutputPath) {
      await copyFile(inputPath, newOutputPath);
    }
  }

  const result: Record<string, any> = {
    input_path: inputPath,
    input_size: data.input.size,
    output_path: newOutputPath,
    output_size: availableCompressRate ? data.output.size : data.input.size,
    compression_rate: availableCompressRate ? compressRatio : 0,
    original_temp_path: tempFilePath,
    available_compress_rate: availableCompressRate,
    hash: await hashFile(inputPath),
    debug: {
      compressedSize: data.output.size,
      compressionRate: newOutputPath,
      options,
      process_options: processOptions,
    },
  };

  if (isValidArray(options.convert_types)) {
    onProgress?.('converting');
    const results = await bulkConvert(
      newOutputPath,
      options.convert_types as ConvertFormat[],
      options.convert_alpha || '#FFFFFF',
    );
    (result as any).convert_results = results;
  }

  onProgress?.('completed');
  return result;
}
