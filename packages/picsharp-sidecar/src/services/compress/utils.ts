import sharp, { Metadata, FormatEnum } from 'sharp';
import { Dimensions } from '../resize';
import { WatermarkType } from '../../constants';
import { addTextWatermark, addImageWatermark } from '../watermark';
import { resizeFromSharpStream } from '../resize';
import { bulkConvert } from '../convert';
import { isValidArray, isWindows, getFileSize, hashFile } from '../../utils';
import path from 'node:path';
import { ConvertFormat, SaveMode } from '../../constants';
import { createOutputPath, copyFileToTemp, createOutputPathTempPath } from '../../utils';
import { rename, unlink, copyFile } from 'node:fs/promises';
import { calCompressionRate } from '../../utils';

type Format = keyof FormatEnum;

export async function applyImageTransformations(
  stream: sharp.Sharp,
  originalMetadata: Dimensions,
  options: any,
) {
  let dimensions: Dimensions = originalMetadata;
  if (options.resize_enable) {
    dimensions = await resizeFromSharpStream({
      stream,
      originalMetadata: dimensions,
      options,
    });
  }
  if (options.watermark_type !== WatermarkType.None) {
    if (options.watermark_type === WatermarkType.Text && options.watermark_text) {
      await addTextWatermark({
        stream: stream,
        text: options.watermark_text,
        color: options.watermark_text_color,
        fontSize: options.watermark_font_size,
        position: options.watermark_position,
        container: dimensions,
      });
    } else if (options.watermark_type === WatermarkType.Image && options.watermark_image_path) {
      await addImageWatermark({
        stream: stream,
        imagePath: options.watermark_image_path,
        opacity: options.watermark_image_opacity,
        scale: options.watermark_image_scale,
        position: options.watermark_position,
        container: dimensions,
      });
    }
  }
}

export async function applyImageConversion(
  stream: sharp.Sharp,
  outputPath: string,
  convertTypes: ConvertFormat[],
  convertAlpha: string,
) {
  if (isValidArray(convertTypes)) {
    return bulkConvert(
      stream,
      path.basename(outputPath, path.extname(outputPath)),
      path.dirname(outputPath),
      convertTypes,
      convertAlpha,
    );
  }
  return [];
}

export async function saveImage(
  stream: sharp.Sharp,
  inputPath: string,
  format: Format,
  originalSize: number,
  options: any,
  process_options: any,
) {
  // 获取输出路径
  const outputPath = await createOutputPath(inputPath, {
    mode: options.save.mode,
    new_file_suffix: options.save.new_file_suffix,
    new_folder_path: options.save.new_folder_path,
  });
  // 复制原始文件到临时文件
  const originalEctypePath = await copyFileToTemp(inputPath, options.temp_dir);
  // 创建输出临时文件
  const outputTempPath = createOutputPathTempPath(outputPath);
  // 输出到临时文件
  const { size: compressedSize } = await stream
    .toFormat(format, process_options)
    .toFile(outputTempPath);
  // 计算压缩率
  const compressionRate = calCompressionRate(originalSize, compressedSize);
  // 判断是否需要压缩
  const availableCompressRate = compressionRate >= (options.limit_compress_rate || 0);
  // 如果需要压缩，则重命名临时文件到输出路径
  if (availableCompressRate) {
    await rename(outputTempPath, outputPath);
    // 如果不需要压缩，则复制原始文件到输出路径
  } else {
    if (inputPath !== outputPath) {
      await copyFile(inputPath, outputPath);
    }
    await unlink(originalEctypePath);
  }
  return {
    availableCompressRate,
    originalEctypePath,
    compressedSize,
    compressionRate,
  };
}

export interface ImageTaskPayload {
  input_path: string;
  options: any;
  process_options: any;
}

export async function processImage(
  transformer: sharp.Sharp,
  format: Format,
  payload: ImageTaskPayload,
  originalSize: number,
  originalMetadata: Metadata,
) {
  const { input_path, options, process_options } = payload;
  if (isWindows && options.save.mode === SaveMode.Overwrite) {
    sharp.cache(false);
  }
  if (options.keep_metadata) transformer.keepMetadata();
  await applyImageTransformations(transformer, originalMetadata, options);
  const outputPath = await createOutputPath(input_path, {
    mode: options.save.mode,
    new_file_suffix: options.save.new_file_suffix,
    new_folder_path: options.save.new_folder_path,
  });
  const convert_results: any[] = await applyImageConversion(
    transformer,
    outputPath,
    options.convert_types,
    options.convert_alpha,
  );
  const { availableCompressRate, originalEctypePath, compressedSize, compressionRate } =
    await saveImage(transformer, input_path, format, originalSize, options, process_options);

  return {
    input_path,
    input_size: originalSize,
    output_path: outputPath,
    output_size: availableCompressRate ? compressedSize : originalSize,
    compression_rate: availableCompressRate ? compressionRate : 0,
    original_temp_path: originalEctypePath,
    available_compress_rate: availableCompressRate,
    hash: await hashFile(outputPath),
    convert_results,
    original_metadata: originalMetadata,
  };
}
