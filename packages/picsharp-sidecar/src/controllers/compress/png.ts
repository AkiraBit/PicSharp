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
import { PngRowFilter } from '@napi-rs/image';
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
    resize_dimensions: z.array(z.number()).optional().default([0, 0]),
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

const LossyProcessOptionsSchema = z
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

const LosslessProcessOptionsSchema = z
  .object({
    fixErrors: z.boolean().optional().default(false),
    force: z.boolean().optional().default(false),
    filter: z.array(z.nativeEnum(PngRowFilter)).optional().default([PngRowFilter.Average]),
    bitDepthReduction: z.boolean().optional().default(true),
    colorTypeReduction: z.boolean().optional().default(true),
    paletteReduction: z.boolean().optional().default(true),
    grayscaleReduction: z.boolean().optional().default(true),
    idatRecoding: z.boolean().optional().default(true),
    strip: z.boolean().optional().default(true),
  })
  .optional()
  .default({});

const LossyPayloadSchema = z.object({
  input_path: z.string(),
  options: OptionsSchema,
  process_options: LossyProcessOptionsSchema,
});

const LosslessPayloadSchema = z.object({
  input_path: z.string(),
  options: OptionsSchema,
  process_options: LosslessProcessOptionsSchema,
});

app.post('/', zValidator('json', LossyPayloadSchema, payloadValidator), async (context) => {
  let { input_path, options, process_options } =
    await context.req.json<z.infer<typeof LossyPayloadSchema>>();
  await checkFile(input_path);
  options = OptionsSchema.parse(options);
  process_options = LossyProcessOptionsSchema.parse(process_options);
  const result = await getThreadPool().run<any, any>({
    type: 'png',
    payload: { input_path, options, process_options },
  });

  return context.json(result);
});

app.post('/lossless', zValidator('json', LosslessPayloadSchema), async (context) => {
  let { input_path, options, process_options } =
    await context.req.json<z.infer<typeof LosslessPayloadSchema>>();
  await checkFile(input_path);
  options = OptionsSchema.parse(options);
  process_options = LosslessProcessOptionsSchema.parse(process_options);
  const result = await getThreadPool().run<any, any>({
    type: 'png-lossless',
    payload: { input_path, options, process_options },
  });

  return context.json(result);
});

export default app;
