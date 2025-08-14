import { optimize, type Config } from 'svgo';
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import {
  calCompressionRate,
  checkFile,
  createOutputPath,
  copyFileToTemp,
  hashFile,
} from '../../../utils';
import { SaveMode } from '../../../constants';

export interface SvgOptions {
  limit_compress_rate?: number;
  save?: {
    mode?: SaveMode;
    new_file_suffix?: string;
    new_folder_path?: string;
  };
  temp_dir?: string;
}

const defaultSvgoConfigs: Config = {
  multipass: true,
  plugins: [{ name: 'preset-default', params: {} }],
};

/**
 * 在 worker 中执行的 SVG 优化流程
 */
export async function handleSvg(
  payload: { codec: 'svg'; inputPath: string; options: SvgOptions },
  onProgress?: (stage: 'starting' | 'processing' | 'writing' | 'completed') => void,
) {
  const { inputPath, options } = payload;
  await checkFile(inputPath);

  onProgress?.('starting');
  const originalContent = await readFile(inputPath, 'utf-8');
  onProgress?.('processing');
  const optimizedContent = optimize(originalContent, defaultSvgoConfigs);
  const compressRatio = calCompressionRate(originalContent.length, optimizedContent.data.length);

  const availableCompressRate = compressRatio >= (options.limit_compress_rate || 0);

  const newOutputPath = await createOutputPath(inputPath, {
    mode: options.save?.mode ?? SaveMode.Overwrite,
    new_file_suffix: options.save?.new_file_suffix ?? '_compressed',
    new_folder_path: options.save?.new_folder_path,
  });

  const tempFilePath = options.temp_dir ? await copyFileToTemp(inputPath, options.temp_dir) : '';
  onProgress?.('writing');
  if (availableCompressRate) {
    await writeFile(newOutputPath, optimizedContent.data);
  } else {
    if (inputPath !== newOutputPath) {
      await copyFile(inputPath, newOutputPath);
    }
  }

  onProgress?.('completed');
  return {
    input_path: inputPath,
    input_size: originalContent.length,
    output_path: newOutputPath,
    output_size: availableCompressRate ? optimizedContent.data.length : originalContent.length,
    compression_rate: availableCompressRate ? compressRatio : 0,
    original_temp_path: tempFilePath,
    available_compress_rate: availableCompressRate,
    hash: await hashFile(newOutputPath),
    debug: {
      compressedSize: optimizedContent.data.length,
      compressionRate: compressRatio,
      options,
    },
  };
}
