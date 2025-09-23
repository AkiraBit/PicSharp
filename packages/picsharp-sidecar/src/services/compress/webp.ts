import { Metadata } from 'sharp';
import { getPlainMetadata, CompressError, getFileSize } from '../../utils';
import { processImage } from './utils';
import sharp from 'sharp';

export interface ImageTaskPayload {
  input_path: string;
  options: any;
  process_options: any;
}

export async function processWebp(payload: ImageTaskPayload) {
  let originalSize: number = 0;
  let originalMetadata: Metadata | undefined;
  try {
    originalSize = await getFileSize(payload.input_path);
    const transformer = sharp(payload.input_path, { limitInputPixels: false, animated: true });
    originalMetadata = await transformer.metadata();
    return await processImage(transformer, 'webp', payload, originalSize, originalMetadata);
  } catch (error) {
    throw new CompressError('Webp Compress Error', {
      cause: error,
      payload: {
        originalSize,
        ...(getPlainMetadata(originalMetadata) || {}),
      },
    });
  }
}
