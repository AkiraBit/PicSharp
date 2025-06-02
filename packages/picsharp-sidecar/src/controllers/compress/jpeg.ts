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
  convertFileSrc,
  isWindows,
} from '../../utils';
import { SaveMode } from '../../constants';
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
  const compressedImageBuffer = await sharp(input_path, {
    limitInputPixels: false,
  })
    .jpeg(process_options)
    .toBuffer();
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

  return context.json({
    input_path,
    input_size: originalSize,
    output_path: newOutputPath,
    output_size: availableCompressRate ? compressedSize : originalSize,
    compression_rate: availableCompressRate ? compressionRate : 0,
    original_temp_path: tempFilePath,
    available_compress_rate: availableCompressRate,
    debug: {
      compressedSize,
      compressionRate,
      options,
      process_options,
    },
  });
});

export default app;
