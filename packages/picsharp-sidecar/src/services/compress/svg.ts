import { optimize } from 'svgo';
import type { Config } from 'svgo';
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { calCompressionRate, createOutputPath, copyFileToTemp, hashFile } from '../../utils';

export interface SvgTaskPayload {
  input_path: string;
  options: any;
}

const defaultSvgoConfigs: Config = {
  multipass: true,
  plugins: [{ name: 'preset-default', params: {} }],
};

export async function processSvg(payload: SvgTaskPayload) {
  const { input_path, options } = payload;
  const originalContent = await readFile(input_path, 'utf-8');
  const optimizedContent = optimize(originalContent, defaultSvgoConfigs);
  const compressRatio = calCompressionRate(originalContent.length, optimizedContent.data.length);
  const availableCompressRate = compressRatio >= (options.limit_compress_rate || 0);
  const newOutputPath = await createOutputPath(input_path, {
    mode: options.save.mode,
    new_file_suffix: options.save.new_file_suffix,
    new_folder_path: options.save.new_folder_path,
  });
  const tempFilePath = options.temp_dir ? await copyFileToTemp(input_path, options.temp_dir) : '';
  if (availableCompressRate) {
    await writeFile(newOutputPath, optimizedContent.data, 'utf-8');
  } else {
    await copyFile(input_path, newOutputPath);
  }
  return {
    input_path,
    input_size: originalContent.length,
    output_path: newOutputPath,
    output_size: availableCompressRate ? optimizedContent.data.length : originalContent.length,
    compression_rate: availableCompressRate ? compressRatio : 0,
    original_temp_path: tempFilePath,
    available_compress_rate: availableCompressRate,
    hash: await hashFile(newOutputPath),
    optimized: optimizedContent.data,
  };
}
