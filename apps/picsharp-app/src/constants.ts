export const SETTINGS_FILE_NAME = 'settings.json';

export const DEFAULT_SETTINGS_FILE_NAME = 'settings.default.json';

export const VALID_TINYPNG_IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'avif'];

export const VALID_IMAGE_EXTS = [...VALID_TINYPNG_IMAGE_EXTS, 'svg', 'gif', 'tiff', 'tif'];

export const VALID_IMAGE_MIME_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  svg: 'image/svg+xml',
  gif: 'image/gif',
  tiff: 'image/tiff',
  tif: 'image/tiff',
};

export enum SettingsKey {
  Language = 'language',
  Autostart = 'autostart',
  CompressionMode = 'compression_mode',
  CompressionType = 'compression_type',
  CompressionLevel = 'compression_level',
  Concurrency = 'concurrency',
  CompressionThresholdEnable = 'compression_threshold_enable',
  CompressionThresholdValue = 'compression_threshold_value',
  CompressionOutput = 'compression_output',
  CompressionOutputSaveAsFileSuffix = 'compression_output_save_as_file_suffix',
  CompressionOutputSaveToFolder = 'compression_output_save_to_folder',
  TinypngApiKeys = 'tinypng_api_keys',
  TinypngPreserveMetadata = 'tinypng_preserve_metadata',
}

export enum CompressionMode {
  Auto = 'auto',
  Remote = 'remote',
  Local = 'local',
}

export enum CompressionType {
  Lossless = 'lossless',
  Lossy = 'lossy',
}

export enum CompressionOutputMode {
  Overwrite = 'overwrite',
  SaveAsNewFile = 'save_as_new_file',
  SaveToNewFolder = 'save_to_new_folder',
}

export enum TinypngMetadata {
  Copyright = 'copyright',
  Creator = 'creator',
  Location = 'location',
}
