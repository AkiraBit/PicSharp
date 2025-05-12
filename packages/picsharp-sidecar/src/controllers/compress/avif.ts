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

enum BitDepthEnum {
  Eight = 8,
  Ten = 10,
  Twelve = 12,
}

const ProcessOptionsSchema = z
  .object({
    // 质量，整数1-100
    quality: z.number().min(1).max(100).optional().default(50),
    // 使用无损压缩模式
    lossless: z.boolean().optional().default(false),
    // CPU努力程度，介于0（最快）和9（最慢）之间
    effort: z.number().min(0).max(9).optional().default(4),
    // 色度子采样，设置为'4:2:0'以使用色度子采样，默认为'4:4:4'
    chromaSubsampling: z.string().optional().default('4:4:4'),
    // 位深度，设置为8、10或12位
    bitdepth: z.nativeEnum(BitDepthEnum).optional().default(BitDepthEnum.Eight),
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
  const compressedImageBuffer = await sharp(input_path).avif(process_options).toBuffer();
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
    output_converted_path: await convertFileSrc(newOutputPath),
    output_size: availableCompressRate ? compressedSize : originalSize,
    compression_rate: availableCompressRate ? compressionRate : 0,
    original_temp_path: tempFilePath,
    original_temp_converted_path: await convertFileSrc(tempFilePath),
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
