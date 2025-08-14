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

export interface TiffOptions {
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

export type TiffCompression =
  | 'none'
  | 'jpeg'
  | 'deflate'
  | 'packbits'
  | 'ccittfax4'
  | 'lzw'
  | 'webp'
  | 'zstd'
  | 'jp2k';
export type TiffPredictor = 'none' | 'horizontal' | 'float';
export type TiffResolutionUnit = 'inch' | 'cm';

export interface TiffProcessOptions {
  quality?: number;
  force?: boolean;
  compression?: TiffCompression;
  predictor?: TiffPredictor;
  pyramid?: boolean;
  tile?: boolean;
  tileWidth?: number;
  tileHeight?: number;
  xres?: number;
  yres?: number;
  resolutionUnit?: TiffResolutionUnit;
  bitdepth?: 1 | 2 | 4 | 8;
  miniswhite?: boolean;
}

interface NormalizedTiffOptions {
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

interface NormalizedTiffProcessOptions {
  quality: number;
  force: boolean;
  compression: TiffCompression;
  predictor: TiffPredictor;
  pyramid: boolean;
  tile: boolean;
  tileWidth: number;
  tileHeight: number;
  xres: number;
  yres: number;
  resolutionUnit: TiffResolutionUnit;
  bitdepth: 1 | 2 | 4 | 8;
  miniswhite: boolean;
}

export async function handleTiff(
  payload: {
    codec: 'tiff';
    inputPath: string;
    options: TiffOptions;
    processOptions: TiffProcessOptions;
  },
  onProgress?: (stage: 'starting' | 'processing' | 'writing' | 'converting' | 'completed') => void,
) {
  const { inputPath, options, processOptions } = payload;
  await checkFile(inputPath);

  const opts: NormalizedTiffOptions = {
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

  const proc: NormalizedTiffProcessOptions = {
    quality: Math.min(100, Math.max(1, processOptions.quality ?? 80)),
    force: processOptions.force ?? true,
    compression: (processOptions.compression ?? 'jpeg') as TiffCompression,
    predictor: (processOptions.predictor ?? 'horizontal') as TiffPredictor,
    pyramid: processOptions.pyramid ?? false,
    tile: processOptions.tile ?? false,
    tileWidth: processOptions.tileWidth ?? 256,
    tileHeight: processOptions.tileHeight ?? 256,
    xres: processOptions.xres ?? 1.0,
    yres: processOptions.yres ?? 1.0,
    resolutionUnit: (processOptions.resolutionUnit ?? 'inch') as TiffResolutionUnit,
    bitdepth: (processOptions.bitdepth ?? 8) as 1 | 2 | 4 | 8,
    miniswhite: processOptions.miniswhite ?? false,
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
  const compressedImageBuffer = await instance.tiff(proc as any).toBuffer();
  const compressedSize = compressedImageBuffer.byteLength;
  const compressionRate = calCompressionRate(originalSize, compressedSize);
  const availableCompressRate = compressionRate >= (opts.limit_compress_rate || 0);

  const newOutputPath = await createOutputPath(inputPath, {
    mode: opts.save.mode,
    new_file_suffix: opts.save.new_file_suffix,
    new_folder_path: opts.save.new_folder_path,
  });

  const tempFilePath = opts.temp_dir ? await copyFileToTemp(inputPath, opts.temp_dir) : '';

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
