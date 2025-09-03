import sharp, { ResizeOptions } from 'sharp';
import path from 'node:path';
import { Transformer } from '@napi-rs/image';
import { readFile } from 'node:fs/promises';

export interface ThumbnailPayload {
  input_path: string;
  output_dir: string;
  ext: string;
  width: number;
  height: number;
  options?: ResizeOptions;
}

export async function generateThumbnail(payload: ThumbnailPayload) {
  const { input_path, output_dir, width, height, options } = payload;
  const buffer = await readFile(input_path);
  const transformedBuffer = await new Transformer(buffer).webp();
  const image = sharp(transformedBuffer, { limitInputPixels: false });
  const finalResizeOptions: ResizeOptions = {
    width,
    height,
    withoutEnlargement: true,
    background: { r: 255, g: 255, b: 255, alpha: 0 },
    ...(width && height ? { fit: 'cover' as const } : {}),
    ...options,
  };
<<<<<<< HEAD
  const safeExt = 'webp';
  // const EXT_TO_FORMAT = {
  //   webp: 'webp',
  //   jpg: 'jpeg',
  //   jpeg: 'jpeg',
  //   png: 'png',
  //   avif: 'avif',
  //   tiff: 'tiff',
  //   tif: 'tiff',
  //   gif: 'gif',
  // } as const;
  // const format = (EXT_TO_FORMAT[safeExt as keyof typeof EXT_TO_FORMAT] ||
  //   'webp') as keyof sharp.FormatEnum;
  const outputPath = path.join(
    output_dir,
    `thumb_${Date.now()}_${process.hrtime.bigint()}.${safeExt}`,
  );
  const info = await image
    .resize(width, height, finalResizeOptions)
    .toFormat(safeExt, { quality: 70 } as any)
=======

  const outputPath = path.join(output_dir, `thumb_${Date.now()}_${process.hrtime.bigint()}.webp`);
  const info = await image
    .resize(width, height, finalResizeOptions)
    .webp({ quality: 70, force: true })
>>>>>>> sidecar/restruct
    .toFile(outputPath);
  return { width: info.width, height: info.height, output_path: outputPath };
}
