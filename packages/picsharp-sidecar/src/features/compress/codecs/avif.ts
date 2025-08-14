import sharp from 'sharp';
import { writeFile, copyFile } from 'node:fs/promises';
import {
  calCompressionRate,
  checkFile,
  getFileSize,
  createOutputPath,
  copyFileToTemp,
  isWindows,
  isValidArray,
  hashFile,
} from '../../../utils';
import { SaveMode } from '../../../constants';
import { bulkConvert, ConvertFormat } from '../../../services/convert';

export interface AvifOptions {
  limit_compress_rate?: number;
  save?: {
    mode?: SaveMode;
    new_file_suffix?: string;
    new_folder_path?: string;
  };
  temp_dir?: string;
  convert_types?: ConvertFormat[];
  convert_alpha?: string;
  keep_metadata?: boolean;
}

export interface AvifProcessOptions {
  quality?: number; // 1-100
  lossless?: boolean;
  effort?: number; // 0-9
  chromaSubsampling?: string; // '4:4:4' | '4:2:0'
  bitdepth?: 8 | 10 | 12;
}

interface NormalizedAvifOptions {
  limit_compress_rate: number;
  save: {
    mode: SaveMode;
    new_file_suffix: string;
    new_folder_path?: string;
  };
  temp_dir?: string;
  convert_types: ConvertFormat[];
  convert_alpha: string;
  keep_metadata: boolean;
}

interface NormalizedAvifProcessOptions {
  quality: number;
  lossless: boolean;
  effort: number;
  chromaSubsampling: string;
  bitdepth: 8 | 10 | 12;
}

export async function handleAvif(
  payload: {
    codec: 'avif';
    inputPath: string;
    options: AvifOptions;
    processOptions: AvifProcessOptions;
  },
  onProgress?: (stage: 'starting' | 'processing' | 'writing' | 'converting' | 'completed') => void,
) {
  // 参数校验放在路由层；worker 侧只做最小校验与执行
  const { inputPath, options, processOptions } = payload;
  await checkFile(inputPath);

  const normalizedOptions: NormalizedAvifOptions = {
    limit_compress_rate: options.limit_compress_rate ?? 0,
    save: {
      mode: options.save?.mode ?? SaveMode.Overwrite,
      new_file_suffix: options.save?.new_file_suffix ?? '_compressed',
      new_folder_path: options.save?.new_folder_path,
    },
    temp_dir: options.temp_dir ?? undefined,
    convert_types: options.convert_types ?? [],
    convert_alpha: options.convert_alpha ?? '#FFFFFF',
    keep_metadata: options.keep_metadata ?? false,
  };

  const normalizedProcess: NormalizedAvifProcessOptions = {
    quality: Math.min(100, Math.max(1, processOptions.quality ?? 50)),
    lossless: processOptions.lossless ?? false,
    effort: Math.min(9, Math.max(0, processOptions.effort ?? 4)),
    chromaSubsampling: processOptions.chromaSubsampling ?? '4:4:4',
    bitdepth: (processOptions.bitdepth ?? 8) as 8 | 10 | 12,
  };

  onProgress?.('starting');
  const originalSize = await getFileSize(inputPath);

  // Windows 覆盖写入时关闭 sharp 缓存，降低文件句柄争用
  if (isWindows && normalizedOptions.save.mode === SaveMode.Overwrite) {
    sharp.cache(false);
  }

  const instance = sharp(inputPath, { limitInputPixels: false });
  if (normalizedOptions.keep_metadata) {
    instance.keepMetadata();
  }

  onProgress?.('processing');
  const compressedImageBuffer = await instance.avif(normalizedProcess).toBuffer();
  const compressedSize = compressedImageBuffer.byteLength;
  const compressionRate = calCompressionRate(originalSize, compressedSize);
  const availableCompressRate = compressionRate >= (normalizedOptions.limit_compress_rate || 0);

  const newOutputPath = await createOutputPath(inputPath, {
    mode: normalizedOptions.save.mode,
    new_file_suffix: normalizedOptions.save.new_file_suffix,
    new_folder_path: normalizedOptions.save.new_folder_path,
  });

  const tempFilePath = normalizedOptions.temp_dir
    ? await copyFileToTemp(inputPath, normalizedOptions.temp_dir)
    : '';

  onProgress?.('writing');
  if (availableCompressRate) {
    await writeFile(newOutputPath, compressedImageBuffer);
  } else {
    if (inputPath !== newOutputPath) {
      await copyFile(inputPath, newOutputPath);
    }
  }

  const result: Record<string, any> = {
    input_path: inputPath,
    input_size: originalSize,
    output_path: newOutputPath,
    output_size: availableCompressRate ? compressedSize : originalSize,
    compression_rate: availableCompressRate ? compressionRate : 0,
    original_temp_path: tempFilePath,
    available_compress_rate: availableCompressRate,
    hash: await hashFile(newOutputPath),
    debug: {
      compressedSize,
      compressionRate,
      options: normalizedOptions,
      process_options: normalizedProcess,
    },
  };

  if (isValidArray(normalizedOptions.convert_types)) {
    onProgress?.('converting');
    const results = await bulkConvert(
      newOutputPath,
      normalizedOptions.convert_types,
      normalizedOptions.convert_alpha,
    );
    (result as any).convert_results = results;
  }

  onProgress?.('completed');
  return result;
}
