const enUS = {
  // Common
  'common.no_image_to_compress': 'No images to compress',
  'common.drag_and_drop': 'Drop to compress',
  'common.start': 'Start',
  'common.stop': 'Stop',
  'common.compress_completed': 'Compress Completed',
  'common.compress_failed': 'Compress Failed',
  'common.compress_failed_msg': 'Compress Failed, Please check the image file and try again.',
  // Nav
  'nav.home': 'Home',
  'nav.compression': 'Compress',
  'nav.watch': 'Watch',
  'nav.settings': 'Settings',
  'nav.update': 'Found New Version',
  // Update
  'update.title': 'Found New Version',
  'update.version': 'Version {{version}}',
  'update.changelog': 'Changelog',
  'update.button.update': 'Update Now',
  'update.message.installed': 'New Version Installed',
  'update.message.failed': 'Update Failed, Please Try Again',
  'update.button.restart': 'Installation Completed, Please Restart',
  'update.successful': 'v{{version}} update completed!',
  // Settings
  'settings.title': 'Settings',
  'settings.description': 'Manage application settings and preferences.',
  'settings.reset_all': 'Reset',
  'settings.reload': 'Reload',
  'settings.reset_all_confirm': 'Are you sure you want to reset all application configurations?',
  // Settings.General
  'settings.general.title': 'General',
  'settings.general.theme.title': 'Theme',
  'settings.general.theme.option.light': 'Light',
  'settings.general.theme.option.dark': 'Dark',
  'settings.general.theme.option.system': 'System',
  // Settings.General.Language
  'settings.general.language.title': 'Language',
  'settings.general.language.description': 'Default use system language.',
  // Settings.General.Notification
  'settings.general.notification.title': 'Notification',
  'settings.general.notification.description': `Allow the application to send system notifications.`,
  'settings.general.notification.got_to_set': 'System Preferences',
  // Settings.General.Autostart
  'settings.general.autostart.title': 'Launch at Startup',
  'settings.general.autostart.description':
    'Automatically start the application when the system starts.',
  // Settings.General.Update
  'settings.general.update.title': 'Auto Check Update',
  'settings.general.update.description':
    'Automatically check for updates and notify you when a new version is available.',
  // Settings.Compression
  'settings.compression.title': 'Compression',
  // Settings.Compression.Concurrency
  'settings.compression.concurrency.title': 'Concurrency',
  'settings.compression.concurrency.description': 'The number of concurrent compression tasks.',
  // Settings.Compression.Mode
  'settings.compression.mode.title': 'Compression Mode',
  'settings.compression.mode.description.auto':
    'Use TinyPNG first, if TinyPNG is unavailable, switch to local compression for retry',
  'settings.compression.mode.description.remote':
    'Use TinyPNG compression service only, need to be online, if TinyPNG is unavailable, compression will fail, suitable for non-private images',
  'settings.compression.mode.description.local':
    'Use local compression only, no need to be online, suitable for private images',
  'settings.compression.mode.option.auto': 'Auto',
  'settings.compression.mode.option.remote': 'TinyPNG',
  'settings.compression.mode.option.local': 'Local',
  // Settings.Compression.Type
  'settings.compression.type.title': 'Compression Type',
  'settings.compression.type.description.lossless':
    'Preserve complete image details but with a lower compression rate, supported formats: PNG/APNG, WebP, AVIF, TIFF/TIF',
  'settings.compression.type.description.lossy':
    'Reduce some image details to significantly reduce file size, all formats are supported.',
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
  // Settings.Compression.Metadata
  'settings.compression.metadata.title': 'Keep Metadata',
  'settings.compression.metadata.description':
    'Keep all metadata (EXIF, ICC, XMP, IPTC) of the original image.',
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
  // Settings.Compression.Convert
  'settings.compression.convert.title': 'Format Conversion',
  'settings.compression.convert.description':
    'After compression is completed, additionally convert the image to the specified format.',
  // Settings.Compression.ConvertAlpha
  'settings.compression.convert_alpha.title': 'Alpha Background Fill',
  'settings.compression.convert_alpha.description':
    'Specifies which color to use for fill when an image with a transparent background is converted to an image format that does not support transparency (e.g. WEBP, AVIF, PNG to JPG).',
  // Settings.Compression.Resize
  'settings.compression.resize.dimensions.title': 'Resize',
  'settings.compression.resize.dimensions.description':
    'Adjust image dimensions during compression. If only one side is configured, the other side will be calculated automatically according to the content itself; if both sides are configured, the image will be scaled or cropped according to the configured size; when the configured size is greater than the original size, the image will not be adjusted.',
  'settings.compression.resize.dimensions.width': 'Width',
  'settings.compression.resize.dimensions.height': 'Height',
  'settings.compression.resize.dimensions.auto': 'Auto',
  // Settings.Compression.Resize.Fit
  'settings.compression.resize.fit.title': 'Content Fit',
  'settings.compression.resize.fit.description':
    'When adjusting dimensions, how should the image be scaled or cropped when the configured size does not match the content itself.',
  'settings.compression.resize.fit.tooltip.title': 'Fit Options Explained',
  'settings.compression.resize.fit.tooltip.contain':
    'Contain: Preserve aspect ratio, scale the image to fit within the dimensions, no cropping.',
  'settings.compression.resize.fit.tooltip.cover':
    'Cover: (default) Preserving aspect ratio, attempt to ensure the image covers both provided dimensions by cropping/clipping to fit.',
  'settings.compression.resize.fit.tooltip.fill':
    'Fill: Ignore the aspect ratio of the input and stretch to both provided dimensions.',
  'settings.compression.resize.fit.tooltip.inside':
    'Inside: Preserving aspect ratio, resize the image to be as large as possible while ensuring its dimensions are less than or equal to both those specified.',
  'settings.compression.resize.fit.tooltip.outside':
    'Outside: Preserving aspect ratio, resize the image to be as small as possible while ensuring its dimensions are greater than or equal to both those specified.',
  // Settings.Compression.Resize.Fit.Option
  'settings.compression.resize.fit.option.contain': 'Contain',
  'settings.compression.resize.fit.option.cover': 'Cover',
  'settings.compression.resize.fit.option.fill': 'Fill',
  'settings.compression.resize.fit.option.inside': 'Inside',
  'settings.compression.resize.fit.option.outside': 'Outside',
  // Settings.Compression.FileIgnore
  'settings.compression.file_ignore.title': 'Ignoring Files',
  'settings.compression.file_ignore.description':
    'When watching for new images, these files will be ignored, multiple files separated by line breaks, support glob syntax.',
  // Settings.Tinypng
  'settings.tinypng.title': 'TinyPNG',
  // Settings.Tinypng.ApiKeys
  'settings.tinypng.api_keys.title': 'Api Keys',
  'settings.tinypng.api_keys.description':
    '<tinypng>TinyPNG</tinypng> is a popular online image compression tool. You can click <here>here</here> to get your API key.',
  'settings.tinypng.api_keys.here': 'here',
  'settings.tinypng.api_keys.form.add_title': 'Add API Key',
  'settings.tinypng.api_keys.form.add_description': 'Add a new API Key to the system.',
  'settings.tinypng.api_keys.form.name': 'Name',
  'settings.tinypng.api_keys.form.name_placeholder': 'Enter name',
  'settings.tinypng.api_keys.form.api_key': 'API Key',
  'settings.tinypng.api_keys.form.api_key_placeholder': 'Enter API Key',
  'settings.tinypng.api_keys.form.api_already_exists': 'API Key already exists',
  'settings.tinypng.api_keys.form.name_already_exists': 'Name already exists',
  'settings.tinypng.api_keys.form.cancel': 'Cancel',
  'settings.tinypng.api_keys.form.add': 'Add',
  'settings.tinypng.api_keys.form.invalid_api_key': 'Invalid API Key',
  'settings.tinypng.api_keys.no_api_keys': 'No API keys defined yet',
  'settings.tinypng.api_keys.table.name': 'Name',
  'settings.tinypng.api_keys.table.api_key': 'API Key',
  'settings.tinypng.api_keys.table.usage': 'Usage',
  'settings.tinypng.api_keys.table.status': 'Status',
  'settings.tinypng.api_keys.table.created_at': 'Created At',
  'settings.tinypng.api_keys.table.actions': 'Actions',
  'settings.tinypng.api_keys.table.delete_title': 'Delete TinyPNG API Key',
  'settings.tinypng.api_keys.table.err_msg': 'Error Message',
  'settings.tinypng.api_keys.table.delete_description': 'Are you sure you want to delete this key?',
  // Settings.Tinypng.Metadata
  'settings.tinypng.metadata.title': 'Preserve Metadata',
  'settings.tinypng.metadata.description': 'Select the metadata to preserve during compression.',
  'settings.tinypng.metadata.copyright': 'Copyright',
  'settings.tinypng.metadata.creator': 'Creator',
  'settings.tinypng.metadata.location': 'Location',
  // Settings.About
  'settings.about.title': 'About',
  'settings.about.description': 'About PicSharp',
  'settings.about.version.title': 'Current Version V{{version}}',
  // Settings.About.Version
  'settings.about.version.description':
    'PicSharp is open source software released under the <license>AGPL-3.0</license> license.',
  'settings.about.version.check_update': 'Check Update',
  'settings.about.version.no_update_available': 'Current is the latest version',
  'settings.about.version.check_update_failed': 'Check Update Failed, Please Try Again',
  // Settings.About.Feedback
  'settings.about.feedback.title': 'Feedback',
  'settings.about.feedback.description':
    'Optimize suggestions, Bug feedback, Feature requests, etc.',
  // Tray
  'tray.open': 'Open',
  'tray.settings': 'Settings',
  'tray.check_update': 'Check Update',
  'tray.quit': 'Quit',
  // Undo
  'undo.original_file_not_exists': 'Original file not exists',
  'undo.output_file_not_exists': 'Output file not exists',
  'undo.success': 'Undo successful',
  'undo.no_allow_undo': 'No allow undo',
  'undo.undone': 'Undone',
  // Menu
  'menu.about': 'About',
  'menu.settings': 'Settings',
  'menu.check_update': 'Check Update',
  'menu.relaunch': 'Relaunch',
  'menu.minimize': 'Minimize',
  'menu.maximize': 'Maximize',
  'menu.fullscreen': 'Fullscreen',
  'menu.hide': 'Hide',
  'menu.hide_others': 'Hide Others',
  'menu.show_all': 'Show All',
  'menu.services': 'Services',
  'menu.exit': 'Quit',
  'menu.help': 'Help',
  'menu.report_issue': 'Report Issue',
  'menu.star_on_github': '🌟 Star on GitHub',
  'menu.edit': 'Edit',
  'menu.edit.undo': 'Undo',
  'menu.edit.redo': 'Redo',
  'menu.edit.cut': 'Cut',
  'menu.edit.copy': 'Copy',
  'menu.edit.paste': 'Paste',
  'menu.edit.delete': 'Delete',
  'menu.edit.select_all': 'Select All',
  'menu.window': 'Window',
  'menu.view': 'View',
  // Window Controls
  'window.controls.minimize': 'Minimize',
  'window.controls.maximize': 'Maximize',
  'window.controls.restore': 'Restore',
  'window.controls.fullscreen': 'Fullscreen',
  'window.controls.exit_fullscreen': 'Exit Fullscreen',
  'window.controls.always_on_top': 'Always on Top',
  'window.controls.cancel_always_on_top': 'Cancel Always on Top',
  'window.controls.close': 'Close',
  // Clipboard
  'clipboard.parse_clipboard_images': 'Parsing clipboard images',
  'clipboard.parse_clipboard_images_error': 'Failed to parse clipboard images: {{error}}',
  'clipboard.parse_clipboard_images_no_images': 'No images found',
  //
  'page.compression.process.actions.save': 'Save',
  'page.compression.process.actions.compress': 'Compress',
  'compression.file_action.open_file': 'View',
  'compression.file_action.compare_file': 'Compare',
  'compression.file_action.compare_file_title': 'Compare: {{name}}',
  'compression.file_action.reveal_in_finder': 'Show in Finder',
  'compression.file_action.reveal_in_exploer': 'Show in File Explorer',
  'compression.file_action.copy': 'Copy',
  'compression.file_action.copy_path': 'Path',
  'compression.file_action.copy_file': 'File',
  'compression.file_action.copy_as_markdown': 'Markdown Code',
  'compression.file_action.undo': 'Undo',
  'compression.file_action.delete_in_list': 'Remove from Current List',
  'compression.toolbar.info.total_files': 'Total',
  'compression.toolbar.info.files_size': 'Storage Space',
  'compression.toolbar.info.saved_volume': 'Space Saved',
  'compression.toolbar.info.saved_volume_rate': 'Reduced',
  'compression.toolbar.info.total_original_size': 'Original',
  'compression.toolbar.info.total_saved_volume': 'Compressed',
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
  'tips.compress_completed': 'Success: {{fulfilled}}  Failed: {{rejected}}  Total Tasks: {{total}}',
  'tips.saving': 'Success: {{fulfilled}}, Failed: {{rejected}}, Total Tasks: {{total}}',
  'tips.save_completed': 'Success: {{fulfilled}}, Failed: {{rejected}}, Total Tasks: {{total}}',
  'tips.settings_reset_success': 'Reset completed',
  'tips.settings_reload_success': 'Reload completed',
  'tips.file_path_copied': 'File path copied to clipboard',
  'tips.markdown_code_copied': 'Markdown code copied to clipboard',
  'tips.file_copied': 'File copied to clipboard',
  'tips.file_copy_failed': 'File copy failed',
  'tips.invalid_paths': 'Invalid file paths',
  'tips.file_not_exists': 'File not exists',
  'tips.path_not_exists': 'File path not exists',
  'tips.watch_and_save_same_folder':
    'The listening directory and the image saving directory are the same',
  'tips.error': 'Error',
  'tips.warning': 'Warning',
  'tips.watch_folder_deleted': 'The listening directory has been deleted',
  'tips.watch_folder_moved_or_renamed': 'The listening directory has been moved or renamed',
  'tips.watching': 'Watching...',
  'tips.are_you_sure_to_exit': 'Are you sure to exit?',
  'tips.please_wait_for_compression_to_finish': 'Please wait for all tasks to finish',
  'tips.path_not_dir': '{{path}} is not a directory',
  'tips.load_image_failed': 'Failed to load',
  'tips.service_startup_failed': 'Service Startup Failed',
  'tips.watch_service_startup_failed': 'Watch service startup failed',
  // Classic Compression Guide
  'page.compression.classic.app_title': 'PicSharp',
  'page.compression.classic.app_description': 'Simple and efficient image compression tool',
  'page.compression.classic.upload_title': 'Image Upload',
  'page.compression.classic.upload_description': 'Paste, drag and drop files or folders here',
  'page.compression.classic.upload_file': 'Files',
  'page.compression.classic.upload_directory': 'Folders',
  'page.compression.classic.tinypng_supported_formats': 'TinyPNG Supported Formats',
  'page.compression.classic.local_supported_formats': 'Local Compression Supported Formats',
  'page.compression.classic.drop_title': 'Release to Upload Images',
  'page.compression.classic.drop_description': 'Supports multiple files and folders',
  'tips.autostart.error': 'Fail to configure autostart',
  'tips.autostart.already_enabled': 'Autostart already enabled',
  'tips.autostart.already_disabled': 'Autostart already disabled',
  'tips.file_watch_not_running':
    'File watch service failed to start, please try again or restart the application',
  'tips.file_watch_abort': 'File watch service has been terminated',
  'tips.file_watch_target_changed': 'The listening directory has been modified or moved',
  'tips.import_files': 'Importing files...',

  // Watch Compression Guide
  'page.compression.watch.guide.title': 'Listen And Auto-Compress',
  'page.compression.watch.guide.description':
    'Listen to new images in the directory and automatically compress them.',
  'page.compression.watch.guide.open_folder': 'Open Folder',
  'page.compression.watch.guide.folder': 'Folder',
  'page.compression.watch.guide.history': 'History',
  'page.compression.watch.guide.attention': 'Attention',
  'page.compression.watch.guide.attention_description':
    'Only recognize new images (new, copy, move) added to the directory, and do not compress images that already exist in the directory. If an image is replaced with an image that already exists in the directory and has the same name, it will be considered the same image and will not be compressed.',
  'page.compression.tinify.error.unsupported_file_type':
    'TinyPNG only supports PNG, JPG, JPEG, WebP, and AVIF images',
  // Image Viewer
  'image_viewer.loading': 'Loading...',
};

export default enUS;
