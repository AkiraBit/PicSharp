import sharp, { PngOptions, Metadata } from 'sharp';
import {
  calCompressionRate,
  createOutputPath,
  copyFileToTemp,
  getFileSize,
  hashFile,
  getPlainMetadata,
  CompressError,
} from '../../utils';
import { writeFile, copyFile, readFile } from 'node:fs/promises';
import { isValidArray, isWindows } from '../../utils';
import { SaveMode, WatermarkType } from '../../constants';
import { bulkConvert } from '../convert';
import { losslessCompressPng, PNGLosslessOptions } from '@napi-rs/image';
import { processImage, applyImageTransformations, applyImageConversion } from './utils';
import path from 'node:path';

export async function processPngLossy(payload: {
  input_path: string;
  options: any;
  process_options: PngOptions;
}) {
  let originalSize: number = 0;
  let originalMetadata: Metadata | undefined;
  try {
    originalSize = await getFileSize(payload.input_path);
    const transformer = sharp(payload.input_path, { limitInputPixels: false });
    originalMetadata = await transformer.metadata();
    return processImage(transformer, 'png', payload, originalSize, originalMetadata);
  } catch (error) {
    throw new CompressError('PNG Lossy Compress Error', {
      cause: error,
      payload: {
        originalSize,
        ...(getPlainMetadata(originalMetadata) || {}),
      },
    });
  }
}

export async function processPngLossless(payload: {
  input_path: string;
  options: any;
  process_options: PNGLosslessOptions;
}) {
  let originalSize: number = 0;
  let originalMetadata: Metadata | undefined;
  try {
    const { input_path, options, process_options } = payload;
    originalSize = await getFileSize(input_path);
    if (isWindows && options.save.mode === SaveMode.Overwrite) {
      sharp.cache(false);
    }
    const transformer = sharp(input_path, { limitInputPixels: false });
    originalMetadata = await transformer.metadata();
    const outputPath = await createOutputPath(input_path, {
      mode: options.save.mode,
      new_file_suffix: options.save.new_file_suffix,
      new_folder_path: options.save.new_folder_path,
    });
    const requiredTransformations =
      options.resize_enable ||
      options.watermark_type !== WatermarkType.None ||
      isValidArray(options.convert_types);
    if (requiredTransformations) {
      if (options.keep_metadata) transformer.keepMetadata();
      await applyImageTransformations(transformer, originalMetadata, options);
      const convert_results: any[] = await applyImageConversion(
        transformer,
        outputPath,
        options.convert_enable,
        options.convert_types,
        options.convert_alpha,
      );
      const optimizedImageBuffer = await losslessCompressPng(
        await transformer
          .png({
            quality: 100,
            force: true,
            palette: false,
          })
          .toBuffer(),
        process_options,
      );
      const compressedSize = optimizedImageBuffer.byteLength;
      const compressionRate = calCompressionRate(originalSize, compressedSize);
      const availableCompressRate = compressionRate >= (options.limit_compress_rate || 0);
      const originalEctypePath = await copyFileToTemp(input_path, options.temp_dir);
      if (availableCompressRate) {
        await writeFile(outputPath, optimizedImageBuffer);
      } else {
        if (input_path !== outputPath) {
          await copyFile(input_path, outputPath);
        }
      }
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
      };
    } else {
      const fileData = await readFile(input_path);
      const optimizedImageBuffer = await losslessCompressPng(fileData, process_options);
      const compressedSize = optimizedImageBuffer.byteLength;
      const compressionRate = calCompressionRate(originalSize, compressedSize);
      const availableCompressRate = compressionRate >= (options.limit_compress_rate || 0);
      const originalEctypePath = await copyFileToTemp(input_path, options.temp_dir);
      if (availableCompressRate) {
        await writeFile(outputPath, optimizedImageBuffer);
      } else {
        if (input_path !== outputPath) {
          await copyFile(input_path, outputPath);
        }
      }
      const convert_results: any[] = await applyImageConversion(
        transformer,
        outputPath,
        options.convert_enable,
        options.convert_types,
        options.convert_alpha,
      );
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
      };
    }
  } catch (error) {
    throw new CompressError('PNG Lossless Compress Error', {
      cause: error,
      payload: {
        originalSize,
        ...(getPlainMetadata(originalMetadata) || {}),
      },
    });
  }
}
