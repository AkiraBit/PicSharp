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

const ProcessOptionsSchema = z
  .object({
    // 质量，整数1-100
    quality: z.number().min(0).max(100).optional().default(80),
    // 是否使用渐进式（交错）扫描
    progressive: z.boolean().optional().default(false),
    // 色度子采样，设置为'4:4:4'以防止色度子采样，默认为'4:2:0'
    chromaSubsampling: z.string().optional().default('4:2:0'),
    // 优化霍夫曼编码表
    optimiseCoding: z.boolean().optional().default(true),
    // 优化编码的替代拼写
    optimizeCoding: z.boolean().optional().default(true),
    // 使用mozjpeg默认值
    mozjpeg: z.boolean().optional().default(false),
    // 应用网格量化
    trellisQuantisation: z.boolean().optional().default(false),
    // 应用过冲去振铃
    overshootDeringing: z.boolean().optional().default(false),
    // 优化渐进式扫描
    optimiseScans: z.boolean().optional().default(false),
    // 优化扫描的替代拼写
    optimizeScans: z.boolean().optional().default(false),
    // 量化表，整数0-8
    quantisationTable: z.number().optional(),
    // 量化表的替代拼写
    quantizationTable: z.number().optional(),
    // 强制JPEG输出，即使输入图像的alpha通道被使用
    force: z.boolean().optional().default(true),
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
  const compressedImageBuffer = await instance.jpeg(process_options).toBuffer();
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
