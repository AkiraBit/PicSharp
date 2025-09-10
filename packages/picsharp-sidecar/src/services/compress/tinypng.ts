import { request } from 'undici';
import { pipeline } from 'node:stream/promises';
import { copyFile } from 'node:fs/promises';
import { bulkConvert } from '../../services/convert';
import { createReadStream, createWriteStream } from 'node:fs';
import {
  calCompressionRate,
  createOutputPath,
  copyFileToTemp,
  isValidArray,
  hashFile,
} from '../../utils';
import { resizeFromSharpStream } from '../resize';
import sharp from 'sharp';
import { addTextWatermark, addImageWatermark } from '../watermark';
import { WatermarkType } from '../../constants';

export interface ImageTaskPayload {
  input_path: string;
  options: any;
  process_options: any;
}

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

const API_ENDPOINT = 'https://api.tinify.com';

export async function processTinyPng(payload: ImageTaskPayload) {
  const { input_path, options, process_options } = payload;
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
  let convert_results: any[] = [];
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
    const transformer = sharp();
    response.body.pipe(transformer);
    resizeFromSharpStream({
      stream: transformer,
      originalMetadata: {
        width: data.output.width,
        height: data.output.height,
      },
      options,
    });
    if (options.watermark_type !== WatermarkType.None) {
      const { info } = await transformer
        .toFormat(data.output.type.replace('image/', '') as any)
        .toBuffer({
          resolveWithObject: true,
        });
      if (options.watermark_type === WatermarkType.Text && options.watermark_text) {
        await addTextWatermark({
          stream: transformer,
          text: options.watermark_text,
          color: options.watermark_text_color,
          fontSize: options.watermark_font_size,
          position: options.watermark_position,
          container: {
            width: info.width,
            height: info.height,
          },
        });
      } else if (options.watermark_type === WatermarkType.Image && options.watermark_image_path) {
        await addImageWatermark({
          stream: transformer,
          imagePath: options.watermark_image_path,
          opacity: options.watermark_image_opacity,
          scale: options.watermark_image_scale,
          position: options.watermark_position,
          container: {
            width: info.width,
            height: info.height,
          },
        });
      }
    }
    const convertedStream = transformer.clone();
    await pipeline(transformer, createWriteStream(newOutputPath));
    if (isValidArray(options.convert_types)) {
      const results = await bulkConvert(
        newOutputPath,
        options.convert_types,
        options.convert_alpha,
        convertedStream,
      );
      convert_results = results;
    }
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
    convert_results,
  };
  return result;
}
