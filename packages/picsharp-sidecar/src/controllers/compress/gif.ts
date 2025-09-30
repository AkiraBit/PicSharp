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
    // 重用现有调色板，否则生成新的（较慢）
    reuse: z.boolean().optional().default(true),
    // 使用渐进式（交错）扫描
    progressive: z.boolean().optional().default(false),
    // 调色板条目的最大数量，包括透明度，介于2和256之间
    colours: z.number().min(2).max(256).optional().default(256),
    // `options.colours`的替代拼写
    colors: z.number().min(2).max(256).optional().default(256),
    // CPU努力程度，介于1（最快）和10（最慢）之间
    effort: z.number().min(1).max(10).optional().default(7),
    // Floyd-Steinberg误差扩散的级别，介于0（最少）和1（最多）之间
    dither: z.number().min(0).max(1).optional().default(1.0),
    // 透明度的最大帧间误差，介于0（无损）和32之间
    interFrameMaxError: z.number().min(0).max(32).optional().default(0),
    // 调色板重用的最大调色板间误差，介于0和256之间
    interPaletteMaxError: z.number().min(0).max(256).optional().default(3),
    // 动画迭代次数，使用0表示无限动画
    loop: z.number().optional().default(0),
    // 动画帧之间的延迟（以毫秒为单位）
    delay: z.union([z.number(), z.array(z.number())]).optional(),
    // 强制GIF输出，否则尝试使用输入格式
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
    type: 'gif',
    payload: { input_path, options, process_options },
  });
  return context.json(result);
});

export default app;
