import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import sharp, { ResizeOptions } from 'sharp';
import path from 'node:path';

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
    const { input_path, output_dir, ext, width, height, options } =
      await c.req.json<z.infer<typeof ThumbnailPayloadSchema>>();

    const image = sharp(input_path, {
      limitInputPixels: false,
    });

    const finalResizeOptions: ResizeOptions = {
      width,
      height,
      withoutEnlargement: true,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
      ...(width && height ? { fit: 'cover' as const } : {}),
      ...options,
    };

    const outputPath = path.join(output_dir, `thumb_${Date.now()}_${process.hrtime.bigint()}.webp`);
    const info = await image
      .resize(width, height, finalResizeOptions)
      .webp({ quality: 70, force: true })
      .toFile(outputPath);
    return c.json({ width: info.width, height: info.height, output_path: outputPath });
  });

  return app;
}
