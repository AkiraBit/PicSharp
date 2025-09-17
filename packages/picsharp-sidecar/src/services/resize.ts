import { Metadata, ResizeOptions, FitEnum, Sharp } from 'sharp';
import { isValidArray, createTempFilePath } from '../utils';
import { nanoid } from 'nanoid';

export interface Dimensions {
  width: number;
  height: number;
}

export type Fit = keyof FitEnum;

export function calculateResizeDimensions(
  originalDimensions: Dimensions,
  targetDimensions: Partial<Dimensions>,
  fitMode: Fit,
): Dimensions {
  const { width: originalWidth, height: originalHeight } = originalDimensions;

  let finalTargetWidth: number;
  let finalTargetHeight: number;

  const originalRatio = originalWidth / originalHeight;

  if (targetDimensions.width && targetDimensions.height) {
    finalTargetWidth = targetDimensions.width;
    finalTargetHeight = targetDimensions.height;
  } else if (targetDimensions.width) {
    finalTargetWidth = targetDimensions.width;
    finalTargetHeight = Math.round(targetDimensions.width / originalRatio);
  } else if (targetDimensions.height) {
    finalTargetWidth = Math.round(targetDimensions.height * originalRatio);
    finalTargetHeight = targetDimensions.height;
  } else {
    return originalDimensions;
  }

  if (fitMode === 'cover') {
    const ratioW = finalTargetWidth / originalWidth;
    const ratioH = finalTargetHeight / originalHeight;
    const finalRatio = Math.max(ratioW, ratioH);
    return {
      width: Math.round(originalWidth * finalRatio),
      height: Math.round(originalHeight * finalRatio),
    };
  }

  if (fitMode === 'contain') {
    const ratioW = finalTargetWidth / originalWidth;
    const ratioH = finalTargetHeight / originalHeight;
    const finalRatio = Math.min(ratioW, ratioH);
    return {
      width: Math.round(originalWidth * finalRatio),
      height: Math.round(originalHeight * finalRatio),
    };
  }

  if (fitMode === 'fill') {
    return {
      width: finalTargetWidth,
      height: finalTargetHeight,
    };
  }

  if (fitMode === 'inside') {
    if (originalWidth <= finalTargetWidth && originalHeight <= finalTargetHeight) {
      return originalDimensions;
    }
    const ratioW = finalTargetWidth / originalWidth;
    const ratioH = finalTargetHeight / originalHeight;
    const finalRatio = Math.min(ratioW, ratioH);
    return {
      width: Math.round(originalWidth * finalRatio),
      height: Math.round(originalHeight * finalRatio),
    };
  }

  if (fitMode === 'outside') {
    const ratioW = finalTargetWidth / originalWidth;
    const ratioH = finalTargetHeight / originalHeight;
    const finalRatio = Math.max(ratioW, ratioH);
    return {
      width: Math.round(originalWidth * finalRatio),
      height: Math.round(originalHeight * finalRatio),
    };
  }

  return originalDimensions;
}
export interface ResizeFromSharpStreamPayload {
  stream: Sharp;
  originalMetadata: Metadata | Dimensions;
  options: any;
}

export async function resizeFromSharpStream(
  params: ResizeFromSharpStreamPayload,
): Promise<Dimensions> {
  const { stream, originalMetadata, options } = params;

  if (
    originalMetadata.width &&
    originalMetadata.height &&
    isValidArray(options.resize_dimensions) &&
    options.resize_dimensions.some((dim: number) => dim > 0)
  ) {
    const params: ResizeOptions = {
      fit: 'inside',
    };
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
      params.fit = options.resize_fit;
    }
    if (params.width || params.height) {
      stream.resize(params);
      const tempFilePath = createTempFilePath(`resize_${nanoid()}.webp`, options.temp_dir);
      const info = await stream
        .clone()
        .webp({
          quality: 70,
          force: true,
          effort: 0,
        })
        .toFile(tempFilePath);
      return {
        width: info.width,
        height: info.height,
      };
    } else {
      return originalMetadata;
    }
  }
  return originalMetadata;
}
