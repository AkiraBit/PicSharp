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
  const { input_path, output_dir, width, height, options, ext } = payload;
  const outputPath = path.join(output_dir, `thumb_${Date.now()}_${process.hrtime.bigint()}.webp`);
  const finalResizeOptions: ResizeOptions = {
    width,
    height,
    withoutEnlargement: true,
    background: { r: 255, g: 255, b: 255, alpha: 0 },
    fit: 'inside',
    ...options,
  };
  try {
    await sharp(input_path, {
      limitInputPixels: false,
      animated: ext === 'gif' || ext === 'webp',
    })
      .resize(finalResizeOptions)
      .webp({ quality: 70, force: true, effort: 0 })
      .toFile(outputPath);
    const info = await sharp(outputPath).metadata();
    return { width: info.width, height: info.height, size: info.size, output_path: outputPath };
  } catch (error) {
    const buffer = await readFile(input_path);
    const transformedBuffer = await new Transformer(buffer).webp();
    const image = sharp(transformedBuffer, { limitInputPixels: false });
    const outputPath = path.join(output_dir, `thumb_${Date.now()}_${process.hrtime.bigint()}.webp`);
    await image.resize(finalResizeOptions).webp({ quality: 70, force: true }).toFile(outputPath);
    const info = await sharp(outputPath).metadata();
    return { width: info.width, height: info.height, size: info.size, output_path: outputPath };
  }
}
