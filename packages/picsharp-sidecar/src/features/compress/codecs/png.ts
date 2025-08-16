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
import { SaveMode, ConvertFormat } from '../../../constants';
import { bulkConvert } from '../../../services/convert';

export interface PngOptions {
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

export interface PngProcessOptions {
  progressive?: boolean;
  compressionLevel?: number; // 0-9
  adaptiveFiltering?: boolean;
  palette?: boolean;
  quality?: number; // 1-100, palette true 时生效
  effort?: number; // 1-10, palette true 时生效
  colours?: number; // 2-256
  colors?: number; // 2-256
  dither?: number; // 0-1
  force?: boolean;
}

interface NormalizedPngOptions {
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

interface NormalizedPngProcessOptions {
  progressive: boolean;
  compressionLevel: number;
  adaptiveFiltering: boolean;
  palette: boolean;
  quality: number;
  effort: number;
  colours: number;
  colors: number;
  dither: number;
  force: boolean;
}

export async function handlePng(payload: {
  inputPath: string;
  options: PngOptions;
  processOptions: PngProcessOptions;
}) {
  const { inputPath, options, processOptions } = payload;
  await checkFile(inputPath);

  const opts: NormalizedPngOptions = {
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

  const proc: NormalizedPngProcessOptions = {
    progressive: processOptions.progressive ?? false,
    compressionLevel: Math.min(9, Math.max(0, processOptions.compressionLevel ?? 6)),
    adaptiveFiltering: processOptions.adaptiveFiltering ?? false,
    palette: processOptions.palette ?? false,
    quality: Math.min(100, Math.max(1, processOptions.quality ?? 100)),
    effort: Math.min(10, Math.max(1, processOptions.effort ?? 7)),
    colours: Math.min(256, Math.max(2, processOptions.colours ?? 256)),
    colors: Math.min(256, Math.max(2, processOptions.colors ?? 256)),
    dither: Math.min(1, Math.max(0, processOptions.dither ?? 1.0)),
    force: processOptions.force ?? true,
  };

  const originalSize = await getFileSize(inputPath);

  if (isWindows && opts.save.mode === SaveMode.Overwrite) {
    sharp.cache(false);
  }

  const sharpInstance = sharp(inputPath, { limitInputPixels: false });

  if (opts.keep_metadata) {
    sharpInstance.keepMetadata();
  }

  const compressedImageBuffer = await sharpInstance.png(proc).toBuffer();
  const compressedSize = compressedImageBuffer.byteLength;
  const compressionRate = calCompressionRate(originalSize, compressedSize);
  const availableCompressRate = compressionRate >= (opts.limit_compress_rate || 0);

  const newOutputPath = await createOutputPath(inputPath, {
    mode: opts.save.mode,
    new_file_suffix: opts.save.new_file_suffix,
    new_folder_path: opts.save.new_folder_path,
  });

  const tempFilePath = opts.temp_dir ? await copyFileToTemp(inputPath, opts.temp_dir) : '';

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
      options: opts,
      process_options: proc,
    },
  };

  if (isValidArray(opts.convert_types)) {
    const results = await bulkConvert(
      newOutputPath,
      opts.convert_types,
      opts.convert_alpha,
      sharpInstance,
    );
    (result as any).convert_results = results;
  }

  return result;
}
