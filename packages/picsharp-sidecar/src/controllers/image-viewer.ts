import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { ResizeOptions } from 'sharp';
import { getThreadPool } from '../workers/thread-pool';

const ThumbnailPayloadSchema = z.object({
  input_path: z.string(),
  output_dir: z.string(),
  ext: z.string(),
  width: z.number(),
  height: z.number(),
  options: z.custom<ResizeOptions>().optional(),
});

export function createImageViewerRouter() {
  const app = new Hono();

  app.post('/thumbnail', zValidator('json', ThumbnailPayloadSchema), async (c) => {
    const payload = await c.req.json<z.infer<typeof ThumbnailPayloadSchema>>();
    const pool = getThreadPool();
    const data = await pool.run<any, any>({ type: 'image:thumbnail' as any, payload });
    return c.json(data);
  });

  return app;
}
