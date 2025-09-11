import sharp from 'sharp';

export async function getRawPixels(input_path: string) {
  const image = sharp(input_path, { limitInputPixels: false, animated: true });
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

export async function toBase64(input_path: string) {
  const image = sharp(input_path, { limitInputPixels: false, animated: true });
  const { format } = await image.metadata();
  const buffer = await image.toBuffer();
  return {
    data: `data:image/${format};base64,${buffer.toString('base64')}`,
  };
}
