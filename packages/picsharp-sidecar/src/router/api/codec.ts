import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import sharp, { ResizeOptions } from 'sharp';

const GetRawPixelsPayloadSchema = z.object({
  input_path: z.string(),
});

const ThumbnailPayloadSchema = z.object({
  input_path: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  options: z.custom<ResizeOptions>().optional(),
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
    return c.json({ width, height, data: Array.from(rawPixels) });
  });

  app.post('/thumbnail', zValidator('json', ThumbnailPayloadSchema), async (c) => {
    const { input_path, width, height, options } =
      await c.req.json<z.infer<typeof ThumbnailPayloadSchema>>();

    const image = sharp(input_path, {
      limitInputPixels: false,
    });

    const requestedWidth = typeof width === 'number' && width > 0 ? Math.floor(width) : undefined;
    const requestedHeight =
      typeof height === 'number' && height > 0 ? Math.floor(height) : undefined;

    // 决策：
    // - 同时提供 width/height：使用二者（强制尺寸，fit: 'fill'）
    // - 仅提供其中一个：按原图比例等比缩放（只传一边）
    let resizeWidth: number | undefined = requestedWidth;
    let resizeHeight: number | undefined = requestedHeight;

    const finalResizeOptions: ResizeOptions = {
      width: requestedWidth,
      height: requestedHeight,
      ...options,
      withoutEnlargement: true,
      ...(requestedWidth && requestedHeight ? { fit: 'cover' as const } : {}),
    };

    const pipeline = image
      .resize(resizeWidth, resizeHeight, finalResizeOptions)
      .avif({ quality: 50 });

    const { data: encodedBuffer, info } = await pipeline.toBuffer({ resolveWithObject: true });
    const rawBuffer = await sharp(encodedBuffer).raw().toBuffer();

    return c.json({ width: info.width, height: info.height, data: Array.from(rawBuffer) });
  });

  return app;
}
