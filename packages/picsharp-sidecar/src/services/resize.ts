import { Metadata, ResizeOptions, Sharp } from 'sharp';
import { isValidArray } from '../utils';

export interface ResizeFromSharpStreamPayload {
  stream: Sharp;
  originalMetadata: Metadata | { width: number; height: number };
  options: any;
}

export function resizeFromSharpStream(params: ResizeFromSharpStreamPayload) {
  const { stream, originalMetadata, options } = params;
  if (
    isValidArray(options.resize_dimensions) &&
    options.resize_dimensions.some((dim: number) => dim > 0)
  ) {
    const params: ResizeOptions = {};
    let useFit = false;
    if (options.resize_dimensions[0] > 0 && options.resize_dimensions[0] < originalMetadata.width) {
      params.width = options.resize_dimensions[0];
      useFit = true;
    }
    if (
      options.resize_dimensions[1] > 0 &&
      options.resize_dimensions[1] < originalMetadata.height
    ) {
      params.height = options.resize_dimensions[1];
      useFit = true;
    }
    if (options.resize_fit && useFit) {
      params.fit = options.resize_fit || 'cover';
    }
    return stream.resize(params);
  } else {
    return stream;
  }
}
