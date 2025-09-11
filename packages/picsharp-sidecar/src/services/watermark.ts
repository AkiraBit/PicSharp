import sharp, { Gravity, Metadata, Sharp } from 'sharp';
import { pxToPangoSize } from '../utils';

export async function addTextWatermark(payload: {
  stream: Sharp;
  text: string;
  color: string;
  fontSize: number;
  position: Gravity;
  container: Metadata | { width: number; height: number };
}) {
  const { stream, text, color, fontSize, position, container } = payload;
  const watermarkImage = sharp({
    text: {
      text: `<span foreground="${color}" size="${pxToPangoSize(Number(fontSize))}">${text}</span>`,
      font: 'sans',
      rgba: true,
    },
  });

  const watermarkBuffer = await watermarkImage.png().toBuffer();
  const watermarkMeta = await sharp(watermarkBuffer).metadata();

  const shouldResize =
    (watermarkMeta.width || 0) > (container.width || 0) ||
    (watermarkMeta.height || 0) > (container.height || 0);

  const watermarkInput = shouldResize
    ? await sharp(watermarkBuffer)
        .resize({
          width: container.width,
          height: container.height,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toBuffer()
    : watermarkBuffer;

  return stream.composite([
    {
      input: watermarkInput,
      gravity: position,
      limitInputPixels: false,
      animated: true,
    },
  ]);
}

export async function addImageWatermark(payload: {
  stream: Sharp;
  imagePath: string;
  opacity: number;
  scale: number;
  position: Gravity;
  container: Metadata | { width: number; height: number };
}) {
  const { stream, imagePath, opacity = 0, scale, position, container } = payload;

  const watermarkWidth = Math.floor((container.width || 0) * scale);
  const watermarkBuffer = await sharp(imagePath)
    .ensureAlpha(0)
    .resize({
      width: watermarkWidth,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .composite([
      {
        input: Buffer.from([255, 255, 255, Math.floor(255 * opacity)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: 'dest-in',
      },
    ])
    .png({
      quality: 90,
      force: true,
    })
    .toBuffer();

  return stream.composite([
    {
      input: watermarkBuffer,
      gravity: position,
      limitInputPixels: false,
      animated: true,
    },
  ]);
}
