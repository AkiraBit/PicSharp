import sharp, { Gravity, Metadata, Sharp } from 'sharp';
import { pxToPangoSize } from '../utils';

export async function addTextWatermark(payload: {
  stream: Sharp;
  text: string;
  color: string;
  fontSize: number;
  position: Gravity;
  container: Metadata;
}) {
  const { stream, text, color, fontSize, position, container } = payload;
  const watermarkImage = sharp({
    text: {
      text: `<span foreground="${color}" size="${pxToPangoSize(fontSize)}">${text}</span>`,
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
