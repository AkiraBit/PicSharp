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
  language = 'language',
  system_notification = 'system_notification',
  autostart = 'autostart',
  compression_action = 'compression_action',
  compression_local_quality_level = 'compression_local_quality_level',
  compression_local_quality_mode = 'compression_local_quality_mode',
  compression_tinypng_api_keys = 'compression_tinypng_api_keys',
  compression_tasks_concurrency = 'compression_tasks_concurrency',
  compression_tasks_output_mode = 'compression_tasks_output_mode',
  compression_tasks_output_mode_save_as_file_suffix = 'compression_tasks_output_mode_save_as_file_suffix',
  compression_tasks_output_mode_save_to_folder = 'compression_tasks_output_mode_save_to_folder',
  compression_tasks_save_compress_rate_limit = 'compression_tasks_save_compress_rate_limit',
  compression_tasks_save_compress_rate_limit_threshold = 'compression_tasks_save_compress_rate_limit_threshold',
  compression_retain_metadata = 'compression_retain_metadata',
}

export enum SettingsCompressionAction {
  Auto = 'auto',
  Remote = 'remote',
  Local = 'local',
}

export enum SettingsCompressionTaskConfigOutputMode {
  Overwrite = 'overwrite',
  SaveAsNewFile = 'save_as_new_file',
  SaveToNewFolder = 'save_to_new_folder',
}

export enum SettingsCompressionTaskConfigMetadata {
  Copyright = 'copyright',
  Creator = 'creator',
  Location = 'location',
}

export enum SettingsCompressionQualityMode {
  Lossless = 'lossless',
  Lossy = 'lossy',
}
