import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { SaveMode, ConvertFormat } from '../../constants';
import { InMemoryJobQueue } from '../../core/queue';

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

const ProcessOptionsSchema = z
  .object({
    quality: z.number().min(1).max(100).optional().default(50),
    lossless: z.boolean().optional().default(false),
    effort: z.number().min(0).max(9).optional().default(4),
    chromaSubsampling: z.string().optional().default('4:4:4'),
    bitdepth: z
      .union([z.literal(8), z.literal(10), z.literal(12)])
      .optional()
      .default(8),
  })
  .optional()
  .default({});

const PayloadSchema = z.object({
  input_path: z.string(),
  options: OptionsSchema,
  process_options: ProcessOptionsSchema,
  wait_ms: z.number().min(0).max(300000).optional().default(0),
});

export function createCompressRouter(queue: InMemoryJobQueue<any, any>) {
  const app = new Hono();

  app.post('/avif', zValidator('json', PayloadSchema), async (c) => {
    const { input_path, options, process_options, wait_ms } =
      await c.req.json<z.infer<typeof PayloadSchema>>();

    // 任务入队，idempotencyKey 允许客户端实现幂等提交
    const { jobId, promise } = await queue.add(
      'compress',
      {
        codec: 'avif',
        inputPath: input_path,
        options,
        processOptions: process_options,
      },
      {
        idempotencyKey: `${input_path}|avif|${JSON.stringify(options)}|${JSON.stringify(process_options)}`,
        priority: 0,
      },
    );

    if (wait_ms && wait_ms > 0) {
      // 最多等待 wait_ms 毫秒；到时未完成返回 202 + job_id
      const race = await Promise.race([
        promise.then((res) => ({ done: true as const, res })),
        new Promise<{ done: false }>((r) => setTimeout(() => r({ done: false }), wait_ms)),
      ]);

      if (race.done) {
        return c.json(race.res);
      }
      return c.json({ status: 202, job_id: jobId }, 202);
    }

    return c.json({ job_id: jobId, status: 'queued' });
  });

  app.post('/jpeg', zValidator('json', PayloadSchema), async (c) => {
    const { input_path, options, process_options, wait_ms } =
      await c.req.json<z.infer<typeof PayloadSchema>>();

    const { jobId, promise } = await queue.add(
      'compress',
      {
        codec: 'jpeg',
        inputPath: input_path,
        options,
        processOptions: process_options,
      },
      {
        idempotencyKey: `${input_path}|jpeg|${JSON.stringify(options)}|${JSON.stringify(process_options)}`,
        priority: 0,
      },
    );

    if (wait_ms && wait_ms > 0) {
      const race = await Promise.race([
        promise.then((res) => ({ done: true as const, res })),
        new Promise<{ done: false }>((r) => setTimeout(() => r({ done: false }), wait_ms)),
      ]);
      if (race.done) return c.json(race.res);
      return c.json({ status: 202, job_id: jobId }, 202);
    }
    return c.json({ job_id: jobId, status: 'queued' });
  });

  app.post('/png', zValidator('json', PayloadSchema), async (c) => {
    const { input_path, options, process_options, wait_ms } =
      await c.req.json<z.infer<typeof PayloadSchema>>();

    const { jobId, promise } = await queue.add(
      'compress',
      {
        codec: 'png',
        inputPath: input_path,
        options,
        processOptions: process_options,
      },
      {
        idempotencyKey: `${input_path}|png|${JSON.stringify(options)}|${JSON.stringify(process_options)}`,
        priority: 0,
      },
    );

    if (wait_ms && wait_ms > 0) {
      const race = await Promise.race([
        promise.then((res) => ({ done: true as const, res })),
        new Promise<{ done: false }>((r) => setTimeout(() => r({ done: false }), wait_ms)),
      ]);
      if (race.done) return c.json(race.res);
      return c.json({ status: 202, job_id: jobId }, 202);
    }
    return c.json({ job_id: jobId, status: 'queued' });
  });

  app.post('/webp', zValidator('json', PayloadSchema), async (c) => {
    const { input_path, options, process_options, wait_ms } =
      await c.req.json<z.infer<typeof PayloadSchema>>();

    const { jobId, promise } = await queue.add(
      'compress',
      {
        codec: 'webp',
        inputPath: input_path,
        options,
        processOptions: process_options,
      },
      {
        idempotencyKey: `${input_path}|webp|${JSON.stringify(options)}|${JSON.stringify(process_options)}`,
        priority: 0,
      },
    );

    if (wait_ms && wait_ms > 0) {
      const race = await Promise.race([
        promise.then((res) => ({ done: true as const, res })),
        new Promise<{ done: false }>((r) => setTimeout(() => r({ done: false }), wait_ms)),
      ]);
      if (race.done) return c.json(race.res);
      return c.json({ status: 202, job_id: jobId }, 202);
    }
    return c.json({ job_id: jobId, status: 'queued' });
  });

  app.post('/gif', zValidator('json', PayloadSchema), async (c) => {
    const { input_path, options, process_options, wait_ms } =
      await c.req.json<z.infer<typeof PayloadSchema>>();

    const { jobId, promise } = await queue.add(
      'compress',
      {
        codec: 'gif',
        inputPath: input_path,
        options,
        processOptions: process_options,
      },
      {
        idempotencyKey: `${input_path}|gif|${JSON.stringify(options)}|${JSON.stringify(process_options)}`,
        priority: 0,
      },
    );

    if (wait_ms && wait_ms > 0) {
      const race = await Promise.race([
        promise.then((res) => ({ done: true as const, res })),
        new Promise<{ done: false }>((r) => setTimeout(() => r({ done: false }), wait_ms)),
      ]);
      if (race.done) return c.json(race.res);
      return c.json({ status: 202, job_id: jobId }, 202);
    }
    return c.json({ job_id: jobId, status: 'queued' });
  });

  app.post('/tiff', zValidator('json', PayloadSchema), async (c) => {
    const { input_path, options, process_options, wait_ms } =
      await c.req.json<z.infer<typeof PayloadSchema>>();

    const { jobId, promise } = await queue.add(
      'compress',
      {
        codec: 'tiff',
        inputPath: input_path,
        options,
        processOptions: process_options,
      },
      {
        idempotencyKey: `${input_path}|tiff|${JSON.stringify(options)}|${JSON.stringify(process_options)}`,
        priority: 0,
      },
    );

    if (wait_ms && wait_ms > 0) {
      const race = await Promise.race([
        promise.then((res) => ({ done: true as const, res })),
        new Promise<{ done: false }>((r) => setTimeout(() => r({ done: false }), wait_ms)),
      ]);
      if (race.done) return c.json(race.res);
      return c.json({ status: 202, job_id: jobId }, 202);
    }
    return c.json({ job_id: jobId, status: 'queued' });
  });

  // SVG 与 Tinify 的 payload 不完全相同，故为它们定义简化的 schema
  const SvgPayload = z.object({
    input_path: z.string(),
    options: z.object({
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
    }),
    wait_ms: z.number().min(0).max(300000).optional().default(0),
  });

  app.post('/svg', zValidator('json', SvgPayload), async (c) => {
    const { input_path, options, wait_ms } = await c.req.json<z.infer<typeof SvgPayload>>();
    const { jobId, promise } = await queue.add(
      'compress',
      { codec: 'svg', inputPath: input_path, options },
      { idempotencyKey: `${input_path}|svg|${JSON.stringify(options)}`, priority: 0 },
    );
    if (wait_ms && wait_ms > 0) {
      const race = await Promise.race([
        promise.then((res) => ({ done: true as const, res })),
        new Promise<{ done: false }>((r) => setTimeout(() => r({ done: false }), wait_ms)),
      ]);
      if (race.done) return c.json(race.res);
      return c.json({ status: 202, job_id: jobId }, 202);
    }
    return c.json({ job_id: jobId, status: 'queued' });
  });

  const TinifyPayload = z.object({
    input_path: z.string(),
    options: z
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
      .default({}),
    process_options: z
      .object({
        api_key: z.string(),
        mime_type: z.string(),
        preserveMetadata: z.array(z.string()).optional(),
      })
      .optional()
      .default({ api_key: '', mime_type: '' }),
    wait_ms: z.number().min(0).max(300000).optional().default(0),
  });

  app.post('/tinify', zValidator('json', TinifyPayload), async (c) => {
    const { input_path, options, process_options, wait_ms } =
      await c.req.json<z.infer<typeof TinifyPayload>>();
    const { jobId, promise } = await queue.add(
      'compress',
      { codec: 'tinify', inputPath: input_path, options, processOptions: process_options },
      {
        idempotencyKey: `${input_path}|tinify|${JSON.stringify(options)}|${JSON.stringify(process_options)}`,
        priority: 0,
      },
    );
    if (wait_ms && wait_ms > 0) {
      const race = await Promise.race([
        promise.then((res) => ({ done: true as const, res })),
        new Promise<{ done: false }>((r) => setTimeout(() => r({ done: false }), wait_ms)),
      ]);
      if (race.done) return c.json(race.res);
      return c.json({ status: 202, job_id: jobId }, 202);
    }
    return c.json({ job_id: jobId, status: 'queued' });
  });

  return app;
}
