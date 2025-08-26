import { Hono } from 'hono';
import { writeFile, copyFile } from 'node:fs/promises';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { checkFile } from '../../utils';
import { SaveMode } from '../../constants';
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
  })
  .optional()
  .default({});

const PayloadSchema = z.object({
  input_path: z.string(),
  options: OptionsSchema,
});

app.post('/', zValidator('json', PayloadSchema), async (context) => {
  let { input_path, options } = await context.req.json<z.infer<typeof PayloadSchema>>();
  await checkFile(input_path);
  options = OptionsSchema.parse(options);

  const pool = getThreadPool();
  const result = await pool.run<any, any>({
    type: 'svg',
    payload: { input_path, options },
  });
  if (result.available_compress_rate) {
    await writeFile(result.output_path, result.optimized);
  } else if (result.input_path !== result.output_path) {
    await copyFile(result.input_path, result.output_path);
  }
  return context.json(result);
});

export default app;
