import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getThreadPool } from '../workers/thread-pool';

const GetRawPixelsPayloadSchema = z.object({
  input_path: z.string(),
});

export function createCodecRouter() {
  const app = new Hono();

  app.post('/get-raw-pixels', zValidator('json', GetRawPixelsPayloadSchema), async (c) => {
    const { input_path } = await c.req.json<z.infer<typeof GetRawPixelsPayloadSchema>>();
    const pool = getThreadPool();
    const data = await pool.run<any, any>({
      type: 'codec:get-raw-pixels' as any,
      payload: { input_path },
    });
    return c.json(data);
  });

  return app;
}
