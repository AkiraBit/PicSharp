const enUS = {
  // Nav
  'nav.home': 'Home',
  'nav.compression': 'Compression',
  'nav.watch': 'Watch & Auto-Compress',
  'nav.settings': 'Settings',
  // Settings
  'settings.title': 'Settings',
  'settings.description': 'Manage application settings and preferences.',
  // Settings.General
  'settings.general.title': 'General',
  // Settings.General.Language
  'settings.general.language.title': 'Language',
  'settings.general.language.description': 'Default use system language',
  // Settings.General.Notification
  'settings.general.notification.title': 'Notification',
  'settings.general.notification.description': `Allow the application to send system notifications`,
  'settings.general.notification.got_to_set': 'System Preferences',
  // Settings.General.Autostart
  'settings.general.autostart.title': 'Launch at Startup',
  'settings.general.autostart.description':
    'Automatically start the application when the system starts.',
  // Settings.Compression
  'settings.compression.title': 'Compression',
  // Settings.Compression.Mode
  'settings.compression.mode.title': 'Compression Mode',
  'settings.compression.mode.description.auto':
    'Default use Tinypng, if Tinypng compression fails, switch to local compression for retry.',
  'settings.compression.mode.description.remote': 'Use Tinypng compression only',
  'settings.compression.mode.description.local': 'Use local compression only',
  'settings.compression.mode.option.auto': 'Auto',
  'settings.compression.mode.option.remote': 'Tinypng',
  'settings.compression.mode.option.local': 'Local',
  // Settings.Compression.Type
  'settings.compression.type.title': 'Compression Type',
  'settings.compression.type.description.lossless':
    'Lossless compression can maintain the original image quality but has a lower compression rate; lossy compression can significantly reduce file size but may lose some image quality.',
  'settings.compression.type.description.lossy':
    'Lossy compression significantly reduces file size by sacrificing some image quality, all formats are supported.',
  'settings.compression.type.option.lossless': 'Lossless',
  'settings.compression.type.option.lossy': 'Lossy',
  // Settings.Compression.Level
  'settings.compression.level.title': 'Compression Level',
  'settings.compression.level.description':
    'When using lossy compression, setting a reasonable compression level can achieve the best visual effect.',
  'settings.compression.level.option.1': 'Very Low',
  'settings.compression.level.option.2': 'Low',
  'settings.compression.level.option.3': 'Medium',
  'settings.compression.level.option.4': 'High',
  'settings.compression.level.option.5': 'Excellent',
  //Settings.Compression.Output
  'settings.compression.output.title': 'Save Type',
  'settings.compression.output.description': 'How to save compressed images after compression.',
  'settings.compression.output.option.overwrite': 'Overwrite',
  'settings.compression.output.option.save_as_new_file': 'Save as New File',
  'settings.compression.output.option.save_to_new_folder': 'Save to New Folder',
  'settings.compression.output.option.save_as_new_file.title': 'New Filename Suffix',
  'settings.compression.output.option.save_as_new_file.description':
    'The original filename is example.jpg, and the suffix is _compressed, then the new filename will be example_compressed.jpg.',
  'settings.compression.output.option.save_to_new_folder.title': 'New Folder',
  'settings.compression.output.option.save_to_new_folder.description':
    'Specify the folder for storing compressed images, default to the system download folder.',
  'settings.compression.output.option.save_to_new_folder.choose': 'Choose Folder',
  //Settings.Compression.Threshold
  'settings.compression.threshold.title': 'Compression Rate Limit',
  'settings.compression.threshold.description':
    'When the image compression rate is below the set threshold, saving will not be performed.',
  // Settings.Tinypng
  'settings.tinypng.title': 'TinyPNG',
  // Settings.Tinypng.ApiKeys
  'settings.tinypng.api_keys.title': 'Api Keys',
  'settings.tinypng.api_keys.description':
    '<tinypng>Tinypng</tinypng> is a tool that helps you compress images. You can click <here>here</here> to get your API key.',
  'settings.tinypng.api_keys.here': 'here',
  //

  'settings.reset_all': 'Reset',
  'settings.reset_all_confirm': 'Are you sure you want to reset all application configurations?',
  'settings.compression.description': 'Manage image compression configurations and preferences.',
  'settings.compression.tinypng_api_keys.title': 'TinyPNG Api Keys',
  'settings.compression.tinypng_api_keys.description':
    '<tinypng>Tinypng</tinypng> is a tool that helps you compress images. You can click <here>here</here> to get your API key.',
  'settings.compression.tinypng_api_keys.description.here': 'here',
  'settings.compression.tinypng_api_keys.form.add_title': 'Add API Key',
  'settings.compression.tinypng_api_keys.form.add_description': 'Add a new API Key to the system.',
  'settings.compression.tinypng_api_keys.form.name': 'Name',
  'settings.compression.tinypng_api_keys.form.name_placeholder': 'Enter name',
  'settings.compression.tinypng_api_keys.form.api_key': 'API Key',
  'settings.compression.tinypng_api_keys.form.api_key_placeholder': 'Enter API Key',
  'settings.compression.tinypng_api_keys.form.api_already_exists': 'API Key already exists',
  'settings.compression.tinypng_api_keys.form.name_already_exists': 'Name already exists',
  'settings.compression.tinypng_api_keys.form.cancel': 'Cancel',
  'settings.compression.tinypng_api_keys.form.add': 'Add',
  'settings.compression.tinypng_api_keys.form.invalid_api_key': 'Invalid API Key',
  'settings.compression.tinypng_api_keys.no_api_keys': 'No API keys defined yet',
  'settings.compression.tinypng_api_keys.table.name': 'Name',
  'settings.compression.tinypng_api_keys.table.api_key': 'API Key',
  'settings.compression.tinypng_api_keys.table.usage': 'Usage',
  'settings.compression.tinypng_api_keys.table.status': 'Status',
  'settings.compression.tinypng_api_keys.table.created_at': 'Created At',
  'settings.compression.tinypng_api_keys.table.actions': 'Actions',
  'settings.compression.tinypng_api_keys.table.delete_title': 'Delete TinyPNG API Key',
  'settings.compression.tinypng_api_keys.table.err_msg': 'Error Message',
  'settings.compression.tinypng_api_keys.table.delete_description':
    'Are you sure you want to delete this key?',
  'settings.compression.task_config.title': 'Task Configuration',
  'settings.compression.task_config.description':
    'Manage task configurations and preferences for image compression.',
  'settings.compression.task_config.concurrency.title': 'Concurrency',
  'settings.compression.task_config.concurrency.description':
    'Maximum number of concurrent tasks for batch compression.',
  'settings.compression.task_config.output.title': 'Save Type',
  'settings.compression.task_config.output.description':
    'How to save compressed images to the file system.',
  'settings.compression.task_config.output.mode.new_file': 'Save as New File',
  'settings.compression.task_config.output.mode.overwrite': 'Overwrite',
  'settings.compression.task_config.output.mode.new_folder': 'Save to New Folder',
  'settings.compression.task_config.output.mode.new_file.title': 'New Filename Suffix',
  'settings.compression.task_config.output.mode.new_file.description':
    'if the original filename is example.jpg and the suffix is _compressed, the new filename will be example_compressed.jpg.',
  'settings.compression.task_config.output.mode.new_folder.title': 'Save Location',
  'settings.compression.task_config.output.mode.new_folder.description':
    'The folder for saving compressed images.',
  'settings.compression.task_config.output.mode.new_folder.choose': 'Choose Folder',
  'settings.compression.task_config.metadata.title': 'Metadata',
  'settings.compression.task_config.metadata.description':
    'Whether to preserve image metadata during compression.',
  'settings.compression.task_config.metadata.copyright': 'Copyright Information',
  'settings.compression.task_config.metadata.creator': 'Creator Information',
  'settings.compression.task_config.metadata.location': 'Location Information',
  'settings.compression.task_config.quick_save.title': 'Quick Save',
  'settings.compression.task_config.quick_save.description':
    'Whether to automatically save to the file system after compression is completed.',
  'settings.compression.task_config.save_compress_rate.title': 'Compression Rate Threshold',
  'settings.compression.task_config.save_compress_rate.description':
    'When enabled, during the save operation, if the image compression rate is below the set threshold, saving will not be performed.',
  'page.compression.process.actions.save': 'Save',
  'page.compression.process.actions.compress': 'Compress',
  'compression.file_action.open_file': 'View',
  'compression.file_action.compare_file': 'Compare',
  'compression.file_action.reveal_in_finder': 'Show in Finder',
  'compression.file_action.reveal_in_exploer': 'Show in File Explorer',
  'compression.file_action.copy_path': 'Copy File Path',
  'compression.file_action.copy_file': 'Copy File',
  'compression.file_action.delete_in_list': 'Remove from Current List',
  'compression.toolbar.info.total_files': 'Number of Images',
  'compression.toolbar.info.files_size': 'Storage Space',
  'compression.toolbar.info.saved_volume': 'Space Saved',
  'compression.toolbar.info.saved_volume_rate': 'Compression Rate',
  'compression.toolbar.info.total_original_size': 'Original Size',
  'compression.toolbar.info.total_saved_volume': 'Space Reduced',
  processing: 'Processing',
  saving: 'Saving',
  compressed: 'Compressed',
  saved: 'Saved',
  failed: 'Failed',
  please_wait: 'Please Wait',
  add_success: 'Added Successfully',
  delete_success: 'Deleted Successfully',
  confirm: 'Confirm',
  cancel: 'Cancel',
  export: 'Export',
  export_success: 'Export Successful',
  export_failed: 'Export Failed',
  import: 'Import',
  import_success: 'Import Successful',
  import_failed: 'Import Failed',
  click_to_view: 'Click to View',
  valid: 'Valid',
  invalid: 'Invalid',
  no_data: 'No Data',
  current_window: 'Current Window',
  new_window: 'New Window',
  ns_compress: 'Compress Images',
  ns_watch_and_compress: 'Watch and Auto-Compress',
  quit: 'Quit',
  goToSettings: 'Setting',
  no_config: 'No Config',
  beforeCompression: 'Before Compression',
  afterCompression: 'After Compression',
  'error.something_went_wrong': 'Oh no, something went wrong‼️',
  'error.unexpected_error': 'An unexpected error occurred while running the application',
  'error.refresh_page': 'Refresh',

  // Toast/Notification messages
  'tips.tinypng_api_keys_not_configured': 'TinyPNG API keys are not configured.',
  'tips.save_to_folder_not_configured': 'Image saving directory is not configured.',
  'tips.compressing': 'Success: {{fulfilled}}, Failed: {{rejected}}, Total Tasks: {{total}}',
  'tips.compress_completed': 'Success: {{fulfilled}} Failed: {{rejected}}  Total Tasks: {{total}}',
  'tips.saving': 'Success: {{fulfilled}}, Failed: {{rejected}}, Total Tasks: {{total}}',
  'tips.save_completed': 'Success: {{fulfilled}}, Failed: {{rejected}}, Total Tasks: {{total}}',
  'tips.settings_reset_success': 'Application configuration reset completed',
  'tips.file_path_copied': 'File path copied to clipboard',
  'tips.file_copied': 'File copied to clipboard',
  'tips.invalid_paths': 'Invalid file paths',
  'tips.file_not_exists': 'File not exists',
  'tips.path_not_exists': 'File path not exists',
  'tips.watch_and_save_same_folder':
    'The listening directory and the image saving directory are the same',
  'tips.error': 'Error',
  'tips.warning': 'Warning',
  'tips.watch_folder_deleted': 'The listening directory has been deleted',
  'tips.watch_folder_moved_or_renamed': 'The listening directory has been moved or renamed',
  'tips.are_you_sure_to_exit': 'Are you sure to exit the current page?',
  'tips.please_wait_for_compression_to_finish': 'Please wait for all tasks to finish',
  // Classic Compression Guide
  'page.compression.classic.app_title': 'PicSharp',
  'page.compression.classic.app_description': 'Simple and efficient image compression tool',
  'page.compression.classic.upload_title': 'Image Upload',
  'page.compression.classic.upload_description':
    'Drag and drop files or folders here, or use the buttons below to select',
  'page.compression.classic.upload_file': 'Files',
  'page.compression.classic.upload_directory': 'Folders',
  'page.compression.classic.tinypng_supported_formats': 'TinyPNG Supported Formats',
  'page.compression.classic.local_supported_formats': 'Local Compression Supported Formats',
  'page.compression.classic.drop_title': 'Release to Upload Images',
  'page.compression.classic.drop_description': 'Supports multiple files and folders',
  'tips.autostart.error': 'Fail to configure autostart',
  'tips.autostart.already_enabled': 'Autostart already enabled',
  'tips.autostart.already_disabled': 'Autostart already disabled',

  // Watch Compression Guide
  'page.compression.watch.guide.title': 'Listen And Auto-Compress',
  'page.compression.watch.guide.description':
    'Select the directory you want to listen, and when new images are added to the directory, they will be automatically compressed.',
  'page.compression.watch.guide.folder': 'Folder',
  'page.compression.watch.guide.history': 'History',
  'page.compression.watch.guide.attention': 'Attention',
  'page.compression.watch.guide.attention_description':
    'Only recognize new images (new, copy, move) added to the directory, and do not compress images that already exist in the directory. If an image is replaced with an image that already exists in the directory and has the same name, it will be considered the same image and will not be compressed.',

  // Features
  'page.compression.classic.feature.batch.title': 'Efficient Batch Processing',
  'page.compression.classic.feature.batch.description':
    'Intelligent algorithms can process multiple image files simultaneously',
  'page.compression.classic.feature.quality.title': 'Maintain Image Quality',
  'page.compression.classic.feature.quality.description':
    'The compression process intelligently balances file size and image quality, ensuring compressed images remain clear and usable.',
  'page.compression.classic.feature.mode.title': 'Offline/Online Compression',
  'page.compression.classic.feature.mode.description':
    'Offline mode ensures images are processed locally, effectively protecting data security and privacy;',
};

export default enUS;
