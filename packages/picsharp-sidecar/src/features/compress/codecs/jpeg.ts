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
  calculateSSIM,
} from '../../../utils';
import { SaveMode } from '../../../constants';
import { bulkConvert, ConvertFormat } from '../../../services/convert';

export interface JpegOptions {
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

export interface JpegProcessOptions {
  quality?: number;
  progressive?: boolean;
  chromaSubsampling?: string;
  optimiseCoding?: boolean;
  optimizeCoding?: boolean;
  mozjpeg?: boolean;
  trellisQuantisation?: boolean;
  overshootDeringing?: boolean;
  optimiseScans?: boolean;
  optimizeScans?: boolean;
  quantisationTable?: number;
  quantizationTable?: number;
  force?: boolean;
}

interface NormalizedJpegOptions {
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

interface NormalizedJpegProcessOptions {
  quality: number;
  progressive: boolean;
  chromaSubsampling: string;
  optimiseCoding: boolean;
  optimizeCoding: boolean;
  mozjpeg: boolean;
  trellisQuantisation: boolean;
  overshootDeringing: boolean;
  optimiseScans: boolean;
  optimizeScans: boolean;
  quantisationTable?: number;
  quantizationTable?: number;
  force: boolean;
}

/**
 * 在 worker 中执行的 JPEG 压缩流程，尽量保持返回字段与旧接口一致
 */
export async function handleJpeg(
  payload: {
    codec: 'jpeg';
    inputPath: string;
    options: JpegOptions;
    processOptions: JpegProcessOptions;
  },
  onProgress?: (stage: 'starting' | 'processing' | 'writing' | 'converting' | 'completed') => void,
) {
  const { inputPath, options, processOptions } = payload;
  await checkFile(inputPath);

  const opts: NormalizedJpegOptions = {
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

  const proc: NormalizedJpegProcessOptions = {
    quality: Math.min(100, Math.max(0, processOptions.quality ?? 80)),
    progressive: processOptions.progressive ?? false,
    chromaSubsampling: processOptions.chromaSubsampling ?? '4:2:0',
    optimiseCoding: processOptions.optimiseCoding ?? true,
    optimizeCoding: processOptions.optimizeCoding ?? true,
    mozjpeg: processOptions.mozjpeg ?? false,
    trellisQuantisation: processOptions.trellisQuantisation ?? false,
    overshootDeringing: processOptions.overshootDeringing ?? false,
    optimiseScans: processOptions.optimiseScans ?? false,
    optimizeScans: processOptions.optimizeScans ?? false,
    quantisationTable: processOptions.quantisationTable,
    quantizationTable: processOptions.quantizationTable,
    force: processOptions.force ?? true,
  };

  onProgress?.('starting');
  const originalSize = await getFileSize(inputPath);

  if (isWindows && opts.save.mode === SaveMode.Overwrite) {
    sharp.cache(false);
  }

  const instance = sharp(inputPath, { limitInputPixels: false });
  if (opts.keep_metadata) {
    instance.keepMetadata();
  }

  onProgress?.('processing');
  const compressedImageBuffer = await instance.jpeg(proc).toBuffer();
  const compressedSize = compressedImageBuffer.byteLength;
  const compressionRate = calCompressionRate(originalSize, compressedSize);
  const availableCompressRate = compressionRate >= (opts.limit_compress_rate || 0);

  const newOutputPath = await createOutputPath(inputPath, {
    mode: opts.save.mode,
    new_file_suffix: opts.save.new_file_suffix,
    new_folder_path: opts.save.new_folder_path,
  });

  const tempFilePath = opts.temp_dir ? await copyFileToTemp(inputPath, opts.temp_dir) : '';
  let mssim = 1;

  onProgress?.('writing');
  if (availableCompressRate) {
    await writeFile(newOutputPath, compressedImageBuffer);
    mssim = await calculateSSIM(inputPath, newOutputPath);
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
    ssim: mssim,
    debug: {
      compressedSize,
      compressionRate,
      options: opts,
      process_options: proc,
    },
  };

  if (isValidArray(opts.convert_types)) {
    onProgress?.('converting');
    const results = await bulkConvert(newOutputPath, opts.convert_types, opts.convert_alpha);
    (result as any).convert_results = results;
  }

  onProgress?.('completed');
  return result;
}
