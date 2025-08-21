import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import sharp from 'sharp';

const GetRawPixelsPayloadSchema = z.object({
  input_path: z.string(),
});

export function createCodecRouter() {
  const app = new Hono();

  app.post('/get-raw-pixels', zValidator('json', GetRawPixelsPayloadSchema), async (c) => {
    const { input_path } = await c.req.json<z.infer<typeof GetRawPixelsPayloadSchema>>();

    const image = sharp(input_path, {
      limitInputPixels: false,
    });
    const metadata = await image.metadata();
    const width = metadata.width;
    const height = metadata.height;
    const rawPixels = await image.raw().toBuffer();
    return c.json({
      width,
      height,
      size: metadata.size,
      format: metadata.format,
      data: Array.from(rawPixels),
    });
  });

  return app;
}
