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

export interface WebpOptions {
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

export type WebpProcessPreset = 'default' | 'photo' | 'picture' | 'drawing' | 'icon' | 'text';

export interface WebpProcessOptions {
  quality?: number;
  alphaQuality?: number;
  lossless?: boolean;
  nearLossless?: boolean;
  smartSubsample?: boolean;
  smartDeblock?: boolean;
  preset?: WebpProcessPreset;
  effort?: number; // 0-6
  loop?: number;
  delay?: number | number[];
  minSize?: boolean;
  mixed?: boolean;
  force?: boolean;
}

interface NormalizedWebpOptions {
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

interface NormalizedWebpProcessOptions {
  quality: number;
  alphaQuality: number;
  lossless: boolean;
  nearLossless: boolean;
  smartSubsample: boolean;
  smartDeblock: boolean;
  preset: WebpProcessPreset;
  effort: number;
  loop: number;
  delay?: number | number[];
  minSize: boolean;
  mixed: boolean;
  force: boolean;
}

export async function handleWebp(
  payload: {
    codec: 'webp';
    inputPath: string;
    options: WebpOptions;
    processOptions: WebpProcessOptions;
  },
  onProgress?: (stage: 'starting' | 'processing' | 'writing' | 'converting' | 'completed') => void,
) {
  const { inputPath, options, processOptions } = payload;
  await checkFile(inputPath);

  const opts: NormalizedWebpOptions = {
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

  const proc: NormalizedWebpProcessOptions = {
    quality: Math.min(100, Math.max(1, processOptions.quality ?? 80)),
    alphaQuality: Math.min(100, Math.max(0, processOptions.alphaQuality ?? 100)),
    lossless: processOptions.lossless ?? false,
    nearLossless: processOptions.nearLossless ?? false,
    smartSubsample: processOptions.smartSubsample ?? false,
    smartDeblock: processOptions.smartDeblock ?? false,
    preset: (processOptions.preset ?? 'default') as WebpProcessPreset,
    effort: Math.min(6, Math.max(0, processOptions.effort ?? 4)),
    loop: processOptions.loop ?? 0,
    delay: processOptions.delay,
    minSize: processOptions.minSize ?? false,
    mixed: processOptions.mixed ?? false,
    force: processOptions.force ?? true,
  };

  onProgress?.('starting');
  const originalSize = await getFileSize(inputPath);

  if (isWindows && opts.save.mode === SaveMode.Overwrite) {
    sharp.cache(false);
  }

  const instance = sharp(inputPath, { animated: true, limitInputPixels: false });
  if (opts.keep_metadata) {
    instance.keepMetadata();
  }

  onProgress?.('processing');
  const compressedImageBuffer = await instance.webp(proc as any).toBuffer();
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
