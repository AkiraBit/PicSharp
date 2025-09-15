import { Metadata, ResizeOptions, Sharp } from 'sharp';
import { isValidArray } from '../utils';

export function calculateResizeDimensions(
  originalMetadata: { width?: number; height?: number },
  options: any,
): { width: number; height: number } {
  const originalWidth = originalMetadata.width;
  const originalHeight = originalMetadata.height;

  if (
    !originalWidth ||
    !originalHeight ||
    !isValidArray(options.resize_dimensions) ||
    !options.resize_dimensions.some((dim: number) => dim > 0)
  ) {
    return { width: originalWidth || 0, height: originalHeight || 0 };
  }

  let targetWidth = options.resize_dimensions[0] > 0 ? options.resize_dimensions[0] : Infinity;
  let targetHeight = options.resize_dimensions[1] > 0 ? options.resize_dimensions[1] : Infinity;

  targetWidth = Math.min(targetWidth, originalWidth);
  targetHeight = Math.min(targetHeight, originalHeight);

  if (options.resize_fit === 'cover' || options.resize_fit === 'contain') {
    const wr = targetWidth / originalWidth;
    const hr = targetHeight / originalHeight;
    let ratio;
    if (options.resize_fit === 'cover') {
      ratio = Math.max(wr, hr);
    } else {
      ratio = Math.min(wr, hr);
    }
    return {
      width: Math.round(originalWidth * ratio),
      height: Math.round(originalHeight * ratio),
    };
  }

  if (targetWidth === Infinity) {
    targetWidth = originalWidth;
  }
  if (targetHeight === Infinity) {
    targetHeight = originalHeight;
  }

  return { width: targetWidth, height: targetHeight };
}

export interface ResizeFromSharpStreamPayload {
  stream: Sharp;
  originalMetadata: Metadata | { width: number; height: number };
  options: any;
}

export function resizeFromSharpStream(params: ResizeFromSharpStreamPayload): {
  width: number;
  height: number;
} {
  const { stream, originalMetadata, options } = params;

  if (
    isValidArray(options.resize_dimensions) &&
    options.resize_dimensions.some((dim: number) => dim > 0)
  ) {
    const params: ResizeOptions = {};
    let useFit = false;
    if (
      options.resize_dimensions[0] > 0 &&
      options.resize_dimensions[0] < (originalMetadata.width || Infinity)
    ) {
      params.width = options.resize_dimensions[0];
      useFit = true;
    }
    if (
      options.resize_dimensions[1] > 0 &&
      options.resize_dimensions[1] < (originalMetadata.height || Infinity)
    ) {
      params.height = options.resize_dimensions[1];
      useFit = true;
    }
    if (options.resize_fit && useFit) {
      params.fit = options.resize_fit || 'cover';
    }
    stream.resize(params);
  }
  return calculateResizeDimensions(originalMetadata, options);
}
