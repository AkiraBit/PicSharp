import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { checkFile } from '../../utils';
import { SaveMode, ConvertFormat, ResizeFit } from '../../constants';
import { getThreadPool } from '../../workers/thread-pool';
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
    resize_dimensions: z.array(z.number()).optional().default([]),
    resize_fit: z.nativeEnum(ResizeFit).optional().default(ResizeFit.Cover),
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
  const result = await getThreadPool().run<any, any>({
    type: 'jpeg',
    payload: { input_path, options, process_options },
  });

  return context.json(result);
});

export default app;
