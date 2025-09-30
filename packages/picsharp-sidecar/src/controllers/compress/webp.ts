import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { checkFile } from '../../utils';
import {
  SaveMode,
  ConvertFormat,
  ResizeFit,
  WatermarkType,
  WatermarkPosition,
} from '../../constants';
import { getThreadPool } from '../../workers/thread-pool';
import { payloadValidator } from '../utils';
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
    convert_enable: z.boolean().optional().default(false),
    convert_types: z.array(z.nativeEnum(ConvertFormat)).optional().default([]),
    convert_alpha: z.string().optional().default('#FFFFFF'),
    resize_enable: z.boolean().optional().default(false),
    resize_dimensions: z.array(z.number()).optional().default([]),
    resize_fit: z.nativeEnum(ResizeFit).optional().default(ResizeFit.Cover),
    watermark_type: z.nativeEnum(WatermarkType).optional().default(WatermarkType.None),
    watermark_position: z
      .nativeEnum(WatermarkPosition)
      .optional()
      .default(WatermarkPosition.BottomRight),
    watermark_text: z.string().optional().default(''),
    watermark_text_color: z.string().optional().default('#FFFFFF'),
    watermark_font_size: z.number().optional().default(16),
    watermark_image_path: z.string().optional().default(''),
    watermark_image_opacity: z.number().min(0).max(1).optional().default(1),
    watermark_image_scale: z.number().min(0).max(1).optional().default(0.15),
    keep_metadata: z.boolean().optional().default(false),
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

app.post('/', zValidator('json', PayloadSchema, payloadValidator), async (context) => {
  let { input_path, options, process_options } =
    await context.req.json<z.infer<typeof PayloadSchema>>();
  await checkFile(input_path);
  options = OptionsSchema.parse(options);
  process_options = ProcessOptionsSchema.parse(process_options);
  const result = await getThreadPool().run<any, any>({
    type: 'webp',
    payload: { input_path, options, process_options },
  });

  return context.json(result);
});

export default app;
