import sharp, { ResizeOptions } from 'sharp';
import path from 'node:path';

export interface ThumbnailPayload {
  input_path: string;
  output_dir: string;
  ext: string;
  width: number;
  height: number;
  options?: ResizeOptions;
}

export async function generateThumbnail(payload: ThumbnailPayload) {
  const { input_path, output_dir, ext, width, height, options } = payload;
  const image = sharp(input_path, { limitInputPixels: false });
  const finalResizeOptions: ResizeOptions = {
    width,
    height,
    withoutEnlargement: true,
    background: { r: 255, g: 255, b: 255, alpha: 0 },
    ...(width && height ? { fit: 'cover' as const } : {}),
    ...options,
  };
  const safeExt = String(ext || 'webp').toLowerCase();
  const EXT_TO_FORMAT = {
    webp: 'webp',
    jpg: 'jpeg',
    jpeg: 'jpeg',
    png: 'png',
    avif: 'avif',
    tiff: 'tiff',
    tif: 'tiff',
    gif: 'gif',
  } as const;
  const format = (EXT_TO_FORMAT[safeExt as keyof typeof EXT_TO_FORMAT] ||
    'webp') as keyof sharp.FormatEnum;
  const outputPath = path.join(
    output_dir,
    `thumb_${Date.now()}_${process.hrtime.bigint()}.${safeExt}`,
  );
  const info = await image
    .resize(width, height, finalResizeOptions)
    .toFormat(format, { quality: 70 } as any)
    .toFile(outputPath);
  return { width: info.width, height: info.height, output_path: outputPath };
}
