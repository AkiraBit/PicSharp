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
  AutoCheckUpdate = 'auto_check_update',
  PrivacyMode = 'privacy_mode',
  CompressionMode = 'compression_mode',
  CompressionType = 'compression_type',
  CompressionLevel = 'compression_level',
  CompressionKeepMetadata = 'compression_keep_metadata',
  Concurrency = 'concurrency',
  CompressionThresholdEnable = 'compression_threshold_enable',
  CompressionThresholdValue = 'compression_threshold_value',
  CompressionOutput = 'compression_output',
  CompressionOutputSaveAsFileSuffix = 'compression_output_save_as_file_suffix',
  CompressionOutputSaveToFolder = 'compression_output_save_to_folder',
  CompressionConvert = 'compression_convert',
  CompressionConvertAlpha = 'compression_convert_alpha',
  CompressionResizeEnable = 'compression_resize_enable',
  CompressionResizeDimensions = 'compression_resize_dimensions',
  CompressionResizeFit = 'compression_resize_fit',
  CompressionWatermarkType = 'compression_watermark_type',
  CompressionWatermarkPosition = 'compression_watermark_position',
  CompressionWatermarkText = 'compression_watermark_text',
  CompressionWatermarkTextColor = 'compression_watermark_text_color',
  CompressionWatermarkFontSize = 'compression_watermark_text_font_size',
  CompressionWatermarkImagePath = 'compression_watermark_image_path',
  CompressionWatermarkImageOpacity = 'compression_watermark_image_opacity',
  CompressionWatermarkImageScale = 'compression_watermark_image_scale',
  CompressionWatchFileIgnore = 'compression_watch_file_ignore',
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

export enum ConvertFormat {
  Avif = 'avif',
  Webp = 'webp',
  Jpg = 'jpg',
  Png = 'png',
}

export enum ResizeFit {
  Contain = 'contain',
  Cover = 'cover',
  Fill = 'fill',
  Inside = 'inside',
  Outside = 'outside',
}

export enum WatermarkType {
  None = 'none',
  Text = 'text',
  Image = 'image',
}

export enum WatermarkPosition {
  Top = 'north',
  TopLeft = 'northwest',
  TopRight = 'northeast',
  Bottom = 'south',
  BottomRight = 'southeast',
  BottomLeft = 'southwest',
  Left = 'west',
  Right = 'east',
  Center = 'center',
}
