import sharp from 'sharp';
import {
  calculateSSIM,
  calCompressionRate,
  createOutputPath,
  copyFileToTemp,
  getFileSize,
  hashFile,
} from '../../utils';

export interface ImageTaskPayload {
  input_path: string;
  options: any;
  process_options: any;
}

export async function processPng(payload: ImageTaskPayload) {
  const { input_path, options, process_options } = payload;
  const originalSize = await getFileSize(input_path);
  const instance = sharp(input_path, { limitInputPixels: false });
  if (options.keep_metadata) instance.keepMetadata();
  const compressedImageBuffer = await instance.png(process_options).toBuffer();
  const compressedSize = compressedImageBuffer.byteLength;
  const compressionRate = calCompressionRate(originalSize, compressedSize);
  const availableCompressRate = compressionRate >= (options.limit_compress_rate || 0);
  const newOutputPath = await createOutputPath(input_path, {
    mode: options.save.mode,
    new_file_suffix: options.save.new_file_suffix,
    new_folder_path: options.save.new_folder_path,
  });
  let mssim = 1;
  const tempFilePath = options.temp_dir ? await copyFileToTemp(input_path, options.temp_dir) : '';
  if (availableCompressRate) {
    await sharp(compressedImageBuffer).toFile(newOutputPath);
    mssim = await calculateSSIM(input_path, newOutputPath);
  } else {
    if (input_path !== newOutputPath) {
      const fs = await import('node:fs/promises');
      await fs.copyFile(input_path, newOutputPath);
    }
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
    ssim: mssim,
  };
}
