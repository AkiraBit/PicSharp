import { Hono } from 'hono';
import { writeFile, copyFile } from 'node:fs/promises';
import sharp from 'sharp';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  calCompressionRate,
  checkFile,
  getFileSize,
  createOutputPath,
  copyFileToTemp,
  isWindows,
  isValidArray,
  hashFile,
} from '../../utils';
import { SaveMode } from '../../constants';
import { bulkConvert, ConvertFormat } from '../../services/convert';
const app = new Hono();

const OptionsSchema = z
  .object({
    limit_compress_rate: z.number().min(0).max(1).optional(),
    save: z
      .object({
        mode: z.nativeEnum(SaveMode).optional().default(SaveMode.Overwrite),
        new_file_suffix: z.string().optional().default('_compressed'),
        new_folder_path: z.string().optional(),
      })
      .optional()
      .default({}),
    temp_dir: z.string().optional(),
    convert_types: z.array(z.nativeEnum(ConvertFormat)).optional().default([]),
    convert_alpha: z.string().optional().default('#FFFFFF'),
    keep_metadata: z.boolean().optional().default(false),
  })
  .optional()
  .default({});

enum CompressionEnum {
  None = 'none',
  Jpeg = 'jpeg',
  Deflate = 'deflate',
  Packbits = 'packbits',
  Ccittfax4 = 'ccittfax4',
  Lzw = 'lzw',
  Webp = 'webp',
  Zstd = 'zstd',
  Jp2k = 'jp2k',
}

enum BitDepthEnum {
  One = 1,
  Two = 2,
  Four = 4,
  Eight = 8,
}

enum ResolutionUnitEnum {
  Inch = 'inch',
  Cm = 'cm',
}

enum PredictorEnum {
  None = 'none',
  Horizontal = 'horizontal',
  Float = 'float',
}

const ProcessOptionsSchema = z
  .object({
    // 质量，整数1-100
    quality: z.number().min(1).max(100).optional().default(80),
    // 强制TIFF输出，否则尝试使用输入格式
    force: z.boolean().optional().default(true),
    // 压缩选项：none, jpeg, deflate, packbits, ccittfax4, lzw, webp, zstd, jp2k
    compression: z.nativeEnum(CompressionEnum).optional().default(CompressionEnum.Jpeg),
    // 压缩预测器选项：none, horizontal, float
    predictor: z.nativeEnum(PredictorEnum).optional().default(PredictorEnum.Horizontal),
    // 写入图像金字塔
    pyramid: z.boolean().optional().default(false),
    // 写入平铺TIFF
    tile: z.boolean().optional().default(false),
    // 水平平铺大小
    tileWidth: z.number().optional().default(256),
    // 垂直平铺大小
    tileHeight: z.number().optional().default(256),
    // 水平分辨率（像素/毫米）
    xres: z.number().optional().default(1.0),
    // 垂直分辨率（像素/毫米）
    yres: z.number().optional().default(1.0),
    // 分辨率单位选项：inch, cm
    resolutionUnit: z.nativeEnum(ResolutionUnitEnum).optional().default(ResolutionUnitEnum.Inch),
    // 降低位深度至1、2或4位
    bitdepth: z.nativeEnum(BitDepthEnum).optional().default(BitDepthEnum.Eight),
    // 将1位图像写为miniswhite
    miniswhite: z.boolean().optional().default(false),
  })
  .optional()
  .default({});

const PayloadSchema = z.object({
  input_path: z.string(),
  options: OptionsSchema,
  process_options: ProcessOptionsSchema,
});

app.post('/', zValidator('json', PayloadSchema), async (context) => {
  let { input_path, options, process_options } =
    await context.req.json<z.infer<typeof PayloadSchema>>();
  await checkFile(input_path);
  options = OptionsSchema.parse(options);
  process_options = ProcessOptionsSchema.parse(process_options);
  const originalSize = await getFileSize(input_path);
  if (isWindows && options.save.mode === SaveMode.Overwrite) {
    sharp.cache(false);
  }
  const instance = sharp(input_path, {
    limitInputPixels: false,
  });
  if (options.keep_metadata) {
    instance.keepMetadata();
  }
  const compressedImageBuffer = await instance.tiff(process_options).toBuffer();
  const compressedSize = compressedImageBuffer.byteLength;
  const compressionRate = calCompressionRate(originalSize, compressedSize);
  const availableCompressRate = compressionRate >= (options.limit_compress_rate || 0);

  const newOutputPath = await createOutputPath(input_path, {
    mode: options.save.mode,
    new_file_suffix: options.save.new_file_suffix,
    new_folder_path: options.save.new_folder_path,
  });

  const tempFilePath = options.temp_dir ? await copyFileToTemp(input_path, options.temp_dir) : '';

  if (availableCompressRate) {
    await writeFile(newOutputPath, compressedImageBuffer);
  } else {
    if (input_path !== newOutputPath) {
      await copyFile(input_path, newOutputPath);
    }
  }

  const result: Record<string, any> = {
    input_path,
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
      options,
      process_options,
    },
  };

  if (isValidArray(options.convert_types)) {
    const results = await bulkConvert(newOutputPath, options.convert_types, options.convert_alpha);
    result.convert_results = results;
  }

  return context.json(result);
});

export default app;
