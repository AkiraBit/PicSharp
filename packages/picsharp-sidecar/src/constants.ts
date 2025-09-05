export enum SaveMode {
  Overwrite = 'overwrite',
  SaveAsNewFile = 'save_as_new_file',
  SaveToNewFolder = 'save_to_new_folder',
}

export enum CodecType {
  PNG = 'png',
  JPEG = 'jpeg',
  JPG = 'jpg',
  WEBP = 'webp',
  AVIF = 'avif',
  TIFF = 'tiff',
  TIF = 'tif',
  SVG = 'svg',
  GIF = 'gif',
  // HEIC = 'heic',
  // HEIF = 'heif',
  TINYPNG = 'tinypng',
}

export enum ConvertFormat {
  PNG = 'png',
  JPG = 'jpg',
  WEBP = 'webp',
  AVIF = 'avif',
}

export const VALID_IMAGE_EXTS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.avif',
  '.svg',
  '.gif',
  '.tiff',
  '.tif',
];

export enum ResizeFit {
  Contain = 'contain',
  Cover = 'cover',
  Fill = 'fill',
  Inside = 'inside',
  Outside = 'outside',
}
