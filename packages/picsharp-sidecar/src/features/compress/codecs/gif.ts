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

export interface GifOptions {
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

export interface GifProcessOptions {
  reuse?: boolean;
  progressive?: boolean;
  colours?: number;
  colors?: number;
  effort?: number; // 1-10
  dither?: number; // 0-1
  interFrameMaxError?: number; // 0-32
  interPaletteMaxError?: number; // 0-256
  loop?: number;
  delay?: number | number[];
  force?: boolean;
}

interface NormalizedGifOptions {
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

interface NormalizedGifProcessOptions {
  reuse: boolean;
  progressive: boolean;
  colours: number;
  colors: number;
  effort: number;
  dither: number;
  interFrameMaxError: number;
  interPaletteMaxError: number;
  loop: number;
  delay?: number | number[];
  force: boolean;
}

export async function handleGif(payload: {
  inputPath: string;
  options: GifOptions;
  processOptions: GifProcessOptions;
}) {
  const { inputPath, options, processOptions } = payload;
  await checkFile(inputPath);

  const opts: NormalizedGifOptions = {
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

  const proc: NormalizedGifProcessOptions = {
    reuse: processOptions.reuse ?? true,
    progressive: processOptions.progressive ?? false,
    colours: Math.min(256, Math.max(2, processOptions.colours ?? 256)),
    colors: Math.min(256, Math.max(2, processOptions.colors ?? 256)),
    effort: Math.min(10, Math.max(1, processOptions.effort ?? 7)),
    dither: Math.min(1, Math.max(0, processOptions.dither ?? 1.0)),
    interFrameMaxError: Math.min(32, Math.max(0, processOptions.interFrameMaxError ?? 0)),
    interPaletteMaxError: Math.min(256, Math.max(0, processOptions.interPaletteMaxError ?? 3)),
    loop: processOptions.loop ?? 0,
    delay: processOptions.delay,
    force: processOptions.force ?? true,
  };

  const originalSize = await getFileSize(inputPath);

  if (isWindows && opts.save.mode === SaveMode.Overwrite) {
    sharp.cache(false);
  }

  const sharpInstance = sharp(inputPath, { animated: true, limitInputPixels: false });
  if (opts.keep_metadata) {
    sharpInstance.keepMetadata();
  }

  const compressedImageBuffer = await sharpInstance.gif(proc as any).toBuffer();
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
