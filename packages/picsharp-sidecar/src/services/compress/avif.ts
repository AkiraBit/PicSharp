import sharp, { Metadata } from 'sharp';
import {
  calCompressionRate,
  createOutputPath,
  copyFileToTemp,
  getFileSize,
  hashFile,
  getPlainMetadata,
} from '../../utils';
import { copyFile, writeFile } from 'node:fs/promises';
import { isValidArray, isWindows } from '../../utils';
import { bulkConvert } from '../convert';
import { SaveMode, WatermarkType } from '../../constants';
import { addTextWatermark, addImageWatermark } from '../watermark';
import { resizeFromSharpStream } from '../resize';
import { CompressError } from '../../extends/CompressError';

export interface ImageTaskPayload {
  input_path: string;
  options: any;
  process_options: any;
}

export async function processAvif(payload: ImageTaskPayload) {
  let originalSize: number = 0;
  let originalMetadata: Metadata | undefined;
  try {
    const { input_path, options, process_options } = payload;
    originalSize = await getFileSize(input_path);
    if (isWindows && options.save.mode === SaveMode.Overwrite) {
      sharp.cache(false);
    }
    const instance = sharp(input_path, { limitInputPixels: false });
    if (options.keep_metadata) instance.keepMetadata();
    originalMetadata = await instance.metadata();
    instance.avif(process_options);
    if (options.resize_enable) {
      resizeFromSharpStream({
        stream: instance,
        originalMetadata,
        options,
      });
    }
    if (options.watermark_type !== WatermarkType.None) {
      const { info } = await instance.toBuffer({
        resolveWithObject: true,
      });
      if (options.watermark_type === WatermarkType.Text && options.watermark_text) {
        await addTextWatermark({
          stream: instance,
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
          stream: instance,
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
    const optimizedImageBuffer = await instance.toBuffer();
    const compressedSize = optimizedImageBuffer.byteLength;
    const compressionRate = calCompressionRate(originalSize, compressedSize);
    const availableCompressRate = compressionRate >= (options.limit_compress_rate || 0);
    const newOutputPath = await createOutputPath(input_path, {
      mode: options.save.mode,
      new_file_suffix: options.save.new_file_suffix,
      new_folder_path: options.save.new_folder_path,
    });
    const tempFilePath = options.temp_dir ? await copyFileToTemp(input_path, options.temp_dir) : '';
    if (availableCompressRate) {
      await writeFile(newOutputPath, optimizedImageBuffer);
    } else {
      if (input_path !== newOutputPath) {
        await copyFile(input_path, newOutputPath);
      }
    }
    let convert_results: any[] = [];
    if (isValidArray(options.convert_types)) {
      const results = await bulkConvert(
        newOutputPath,
        options.convert_types,
        options.convert_alpha,
        instance,
      );
      convert_results = results;
    }
    return {
      input_path,
      input_size: originalSize,
      output_path: newOutputPath,
      output_size: availableCompressRate ? compressedSize : originalSize,
      compression_rate: availableCompressRate ? compressionRate : 0,
      original_temp_path: tempFilePath,
      available_compress_rate: availableCompressRate,
      hash: await hashFile(newOutputPath),
      convert_results,
    };
  } catch (error) {
    throw new CompressError('AVIF Compress Error', {
      cause: error,
      payload: {
        originalSize,
        ...(getPlainMetadata(originalMetadata) || {}),
      },
    });
  }
}
