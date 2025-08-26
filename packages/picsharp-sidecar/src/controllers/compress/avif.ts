import { Hono } from 'hono';
import sharp from 'sharp';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { checkFile, isWindows, isValidArray } from '../../utils';
import { SaveMode, ConvertFormat } from '../../constants';
import { bulkConvert } from '../../services/convert';
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
    keep_metadata: z.boolean().optional().default(false),
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
  if (isWindows && options.save.mode === SaveMode.Overwrite) {
    sharp.cache(false);
  }
  const pool = getThreadPool();
  const result = await pool.run<any, any>({
    type: 'avif',
    payload: { input_path, options, process_options },
  });

  if (isValidArray(options.convert_types)) {
    const results = await bulkConvert(
      result.output_path,
      options.convert_types,
      options.convert_alpha,
    );
    result.convert_results = results;
  }

  return context.json(result);
});

export default app;
