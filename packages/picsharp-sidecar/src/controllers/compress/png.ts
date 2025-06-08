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
  })
  .optional()
  .default({});

const ProcessOptionsSchema = z
  .object({
    // 是否使用渐进式（交错）扫描
    progressive: z.boolean().optional().default(false),
    // 压缩级别，整数0-9，0（最快，最大）到9（最慢，最小）
    compressionLevel: z.number().min(0).max(9).optional().default(6),
    // 使用自适应行过滤
    adaptiveFiltering: z.boolean().optional().default(false),
    // 量化为具有alpha透明度支持的基于调色板的图像
    palette: z.boolean().optional().default(false),
    // 使用达到给定质量所需的最低颜色数量，将`palette`设置为`true`
    quality: z.number().min(1).max(100).optional().default(100),
    // CPU努力程度，介于1（最快）和10（最慢）之间，将`palette`设置为`true`
    effort: z.number().min(1).max(10).optional().default(7),
    // 调色板条目的最大数量，将`palette`设置为`true`
    colours: z.number().min(2).max(256).optional().default(256),
    // `options.colours`的替代拼写，将`palette`设置为`true`
    colors: z.number().min(2).max(256).optional().default(256),
    // Floyd-Steinberg误差扩散的级别，将`palette`设置为`true`
    dither: z.number().min(0).max(1).optional().default(1.0),
    // 强制PNG输出，否则尝试使用输入格式
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
    .png(process_options)
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

  const result: Record<string, any> = {
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
  };

  if (isValidArray(options.convert_types)) {
    const results = await bulkConvert(newOutputPath, options.convert_types, options.convert_alpha);
    result.convert_results = results;
  }

  return context.json(result);
});

export default app;
