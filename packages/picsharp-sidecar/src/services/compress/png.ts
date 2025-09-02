import sharp, { PngOptions } from 'sharp';
import {
  calculateSSIM,
  calCompressionRate,
  createOutputPath,
  copyFileToTemp,
  getFileSize,
  hashFile,
} from '../../utils';
import { writeFile, copyFile, readFile } from 'node:fs/promises';
import { isValidArray, isWindows } from '../../utils';
import { SaveMode } from '../../constants';
import { bulkConvert } from '../convert';
import { losslessCompressPng, PNGLosslessOptions } from '@napi-rs/image';

export async function processPngLossy(payload: {
  input_path: string;
  options: any;
  process_options: {
    lossy: PngOptions;
  };
}) {
  console.log('有损压缩');
  const {
    input_path,
    options,
    process_options: { lossy: process_options },
  } = payload;
  const originalSize = await getFileSize(input_path);
  if (isWindows && options.save.mode === SaveMode.Overwrite) {
    sharp.cache(false);
  }
  const instance = sharp(input_path, { limitInputPixels: false });
  if (options.keep_metadata) instance.keepMetadata();
  const optimizedInstance = instance.png(process_options);
  const optimizedImageBuffer = await optimizedInstance.toBuffer();
  const compressedSize = optimizedImageBuffer.byteLength;
  const compressionRate = calCompressionRate(originalSize, compressedSize);
  const availableCompressRate = compressionRate >= (options.limit_compress_rate || 0);
  const newOutputPath = await createOutputPath(input_path, {
    mode: options.save.mode,
    new_file_suffix: options.save.new_file_suffix,
    new_folder_path: options.save.new_folder_path,
  });
  // let mssim = 1;
  const tempFilePath = options.temp_dir ? await copyFileToTemp(input_path, options.temp_dir) : '';
  if (availableCompressRate) {
    await writeFile(newOutputPath, optimizedImageBuffer);
    // mssim = await calculateSSIM(input_path, newOutputPath);
  } else {
    if (input_path !== newOutputPath) {
      await copyFile(input_path, newOutputPath);
    }
  }
  let convert_results: any[] = [];
  if (isValidArray(options.convert_types)) {
    const results = await bulkConvert(newOutputPath, options.convert_types, options.convert_alpha);
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
    // ssim: mssim,
  };
}

export async function processPngLossless(payload: {
  input_path: string;
  options: any;
  process_options: {
    lossless: PNGLosslessOptions;
  };
}) {
  console.log('无损压缩');
  const {
    input_path,
    options,
    process_options: { lossless: process_options },
  } = payload;
  const originalSize = await getFileSize(input_path);
  const fileData = await readFile(input_path);
  const optimizedData = await losslessCompressPng(fileData, process_options);
  const compressedSize = optimizedData.byteLength;
  const compressionRate = calCompressionRate(originalSize, compressedSize);
  const availableCompressRate = compressionRate >= (options.limit_compress_rate || 0);
  const newOutputPath = await createOutputPath(input_path, {
    mode: options.save.mode,
    new_file_suffix: options.save.new_file_suffix,
    new_folder_path: options.save.new_folder_path,
  });
  const tempFilePath = options.temp_dir ? await copyFileToTemp(input_path, options.temp_dir) : '';
  if (availableCompressRate) {
    await writeFile(newOutputPath, optimizedData);
  } else {
    if (input_path !== newOutputPath) {
      await copyFile(input_path, newOutputPath);
    }
  }
  let convert_results: any[] = [];
  if (isValidArray(options.convert_types)) {
    const results = await bulkConvert(newOutputPath, options.convert_types, options.convert_alpha);
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
}
