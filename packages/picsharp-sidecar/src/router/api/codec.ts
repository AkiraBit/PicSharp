import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import sharp from 'sharp';

const PayloadSchema = z.object({
  input_path: z.string(),
});

export function createCodecRouter() {
  const app = new Hono();

  app.post('/get-raw-pixels', zValidator('json', PayloadSchema), async (c) => {
    const { input_path } = await c.req.json<z.infer<typeof PayloadSchema>>();

    const image = sharp(input_path);
    const metadata = await image.metadata();
    const width = metadata.width;
    const height = metadata.height;
    const rawPixels = await image.raw().toBuffer();
    return c.json({ width, height, data: Array.from(rawPixels) });
  });

  return app;
}
