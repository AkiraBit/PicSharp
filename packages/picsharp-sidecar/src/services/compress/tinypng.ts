import { request } from 'undici';
import { pipeline } from 'node:stream/promises';
import { copyFile } from 'node:fs/promises';
import { bulkConvert } from '../../services/convert';
import { createReadStream, createWriteStream } from 'node:fs';
import {
  calCompressionRate,
  createOutputPath,
  createTempFilePath,
  copyFileToTemp,
  isValidArray,
  hashFile,
  getPlainMetadata,
  isWindows,
  getFileSize,
  CompressError,
} from '../../utils';
import { resizeFromSharpStream } from '../resize';
import sharp, { Metadata } from 'sharp';
import { addTextWatermark, addImageWatermark } from '../watermark';
import { SaveMode, WatermarkType } from '../../constants';
import { applyImageConversion } from './utils';

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
  error?: string;
  message?: string;
}

const API_ENDPOINT = 'https://api.tinify.com';

async function upload(inputPath: string, mimeType: string, apiKey: string): Promise<TinifyResult> {
  const response = await request<TinifyResult>(`${API_ENDPOINT}/shrink`, {
    method: 'POST',
    headers: {
      'Content-Type': mimeType,
      Authorization: `Basic ${btoa(`api:${apiKey}`)}`,
    },
    body: createReadStream(inputPath),
  });

  const data = (await response.body?.json()) as TinifyResult;
  if (data?.error) {
    throw new Error(`${data.error}, ${data.message}`);
  }
  return data;
}

async function download(tinypngResult: TinifyResult, process_options: any) {
  const body: Record<string, any> = {};
  if (isValidArray(process_options.preserveMetadata)) {
    body.preserve = process_options.preserveMetadata;
  }
  const hasBody = Object.keys(body).length > 0;
  return request(tinypngResult.output.url, {
    method: hasBody ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${btoa(`api:${process_options.api_key}`)}`,
    },
    body: hasBody ? JSON.stringify(body) : undefined,
  });
}

async function applyImageTransformations(
  transformer: sharp.Sharp,
  options: any,
  initialMetadata: { width: number; height: number },
) {
  let hasTransformations = false;
  let dimensions = initialMetadata;
  if (options.resize_enable) {
    hasTransformations = true;
    dimensions = await resizeFromSharpStream({
      stream: transformer,
      originalMetadata: dimensions,
      options,
    });
  }

  if (options.watermark_type !== WatermarkType.None) {
    hasTransformations = true;
    if (options.watermark_type === WatermarkType.Text && options.watermark_text) {
      await addTextWatermark({
        stream: transformer,
        text: options.watermark_text,
        color: options.watermark_text_color,
        fontSize: options.watermark_font_size,
        position: options.watermark_position,
        container: dimensions,
      });
    } else if (options.watermark_type === WatermarkType.Image && options.watermark_image_path) {
      await addImageWatermark({
        stream: transformer,
        imagePath: options.watermark_image_path,
        opacity: options.watermark_image_opacity,
        scale: options.watermark_image_scale,
        position: options.watermark_position,
        container: dimensions,
      });
    }
  }

  return { hasTransformations };
}

async function downloadAndProcessImage(
  tinypngResult: TinifyResult,
  inputPath: string,
  outputPath: string,
  availableCompressRate: boolean,
  options: any,
  process_options: any,
) {
  let transformer: sharp.Sharp;
  let entryFilePath: string = inputPath;
  if (availableCompressRate) {
    const response = await download(tinypngResult, process_options);
    entryFilePath = createTempFilePath(inputPath, options.temp_dir);
    await pipeline(response.body, createWriteStream(entryFilePath));
  }

  transformer = sharp(entryFilePath, {
    limitInputPixels: false,
    animated: tinypngResult.input.type === 'image/webp',
  });

  const { hasTransformations } = await applyImageTransformations(
    transformer,
    options,
    tinypngResult.output,
  );

  const convert_results: any[] = await applyImageConversion(
    transformer,
    outputPath,
    options.convert_enable,
    options.convert_types,
    options.convert_alpha,
  );

  if (hasTransformations) {
    await pipeline(transformer, createWriteStream(outputPath));
  } else {
    await copyFile(entryFilePath, outputPath);
  }

  return convert_results;
}

export async function processTinyPng(payload: ImageTaskPayload) {
  let originalSize: number = 0;
  let originalMetadata: Metadata | undefined;
  let tinypngResult: TinifyResult | undefined;
  try {
    const { input_path, options, process_options } = payload;
    if (isWindows && options.save.mode === SaveMode.Overwrite) {
      sharp.cache(false);
    }
    originalSize = await getFileSize(input_path);
    originalMetadata = await sharp(input_path, {
      limitInputPixels: false,
      animated: process_options.mime_type === 'image/webp',
    }).metadata();

    tinypngResult = await upload(input_path, process_options.mime_type, process_options.api_key);

    const compressRatio = calCompressionRate(originalSize, tinypngResult.output.size);
    const availableCompressRate = compressRatio >= (options.limit_compress_rate || 0);

    const newOutputPath = await createOutputPath(input_path, {
      mode: options.save.mode,
      new_file_suffix: options.save.new_file_suffix,
      new_folder_path: options.save.new_folder_path,
    });

    const originalTempPath = await copyFileToTemp(input_path, options.temp_dir);
    let convert_results: any[] = [];

    convert_results = await downloadAndProcessImage(
      tinypngResult,
      input_path,
      newOutputPath,
      availableCompressRate,
      options,
      process_options,
    );

    return {
      input_path,
      input_size: originalSize,
      output_path: newOutputPath,
      output_size: availableCompressRate ? await getFileSize(newOutputPath) : originalSize,
      compression_rate: availableCompressRate ? compressRatio : 0,
      original_temp_path: originalTempPath,
      available_compress_rate: availableCompressRate,
      hash: await hashFile(input_path),
      debug: {
        compressionRate: compressRatio,
        options,
        process_options,
      },
      convert_results,
    };
  } catch (error) {
    throw new CompressError('TinyPng Compress Error', {
      cause: error,
      payload: {
        originalSize,
        ...(getPlainMetadata(originalMetadata) || {}),
        tinypngResult: tinypngResult ? JSON.stringify(tinypngResult) : undefined,
      },
    });
  }
}
