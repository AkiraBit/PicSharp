import sharp from 'sharp';

export async function getRawPixels(input_path: string) {
  const image = sharp(input_path, { limitInputPixels: false });
  const metadata = await image.metadata();
  const width = metadata.width;
  const height = metadata.height;
  const rawPixels = await image.raw().toBuffer();
  return {
    width,
    height,
    size: metadata.size,
    format: metadata.format,
    data: Array.from(rawPixels),
  };
}
