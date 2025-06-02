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

enum PresetEnum {
  Default = 'default',
  Photo = 'photo',
  Picture = 'picture',
  Drawing = 'drawing',
  Icon = 'icon',
  Text = 'text',
}
const ProcessOptionsSchema = z
  .object({
    // 质量，整数1-100
    quality: z.number().min(1).max(100).optional().default(80),
    // alpha层的质量，整数0-100
    alphaQuality: z.number().min(0).max(100).optional().default(100),
    // 使用无损压缩模式
    lossless: z.boolean().optional().default(false),
    // 使用近无损压缩模式
    nearLossless: z.boolean().optional().default(false),
    // 使用高质量色度子采样
    smartSubsample: z.boolean().optional().default(false),
    // 自动调整去块滤波器，可以改善低对比度边缘（较慢）
    smartDeblock: z.boolean().optional().default(false),
    // 预处理/过滤的命名预设，可选值：default, photo, picture, drawing, icon, text
    preset: z.nativeEnum(PresetEnum).optional().default(PresetEnum.Default),
    // CPU努力程度，介于0（最快）和6（最慢）之间
    effort: z.number().min(0).max(6).optional().default(4),
    // 动画迭代次数，使用0表示无限动画
    loop: z.number().optional().default(0),
    // 动画帧之间的延迟（以毫秒为单位）
    delay: z.union([z.number(), z.array(z.number())]).optional(),
    // 防止使用动画关键帧以最小化文件大小（较慢）
    minSize: z.boolean().optional().default(false),
    // 允许混合有损和无损动画帧（较慢）
    mixed: z.boolean().optional().default(false),
    // 强制WebP输出，否则尝试使用输入格式
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
    animated: true,
    limitInputPixels: false,
  })
    .webp(process_options)
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
