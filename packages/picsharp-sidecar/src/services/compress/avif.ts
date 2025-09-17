import { Metadata } from 'sharp';
import { getPlainMetadata, CompressError, getFileSize } from '../../utils';
import { processImage, ImageTaskPayload } from './utils';
import sharp from 'sharp';

export async function processAvif(payload: ImageTaskPayload) {
  let originalSize: number = 0;
  let originalMetadata: Metadata | undefined;
  try {
    originalSize = await getFileSize(payload.input_path);
    const transformer = sharp(payload.input_path, { limitInputPixels: false });
    originalMetadata = await transformer.metadata();
    return processImage(transformer, 'avif', payload, originalSize, originalMetadata);
  } catch (error) {
    throw new CompressError('AVIF Compress Error', {
      cause: error,
      payload: {
        originalSize,
        ...(getPlainMetadata(originalMetadata) || {}),
      },
    });
  }
}
