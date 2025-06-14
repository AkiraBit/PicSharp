use inspect::Inspect;
use log::{error, info};
use std::fs;
use std::path::PathBuf;
use tauri::path::BaseDirectory;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};
use tauri::{AppHandle, Emitter, Listener, Manager, Url};
use tauri_plugin_fs::FsExt;
mod clipboard;
mod command;
mod file;
mod file_ext;
// mod image_processor;
mod inspect;
// mod tinify;
mod upload;
mod window;

fn init_settings(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let app_data_dir = app.path().app_data_dir()?;
    if !app_data_dir.exists() {
        info!("[Init Settings] -> App data dir not exists, create it");
        fs::create_dir_all(&app_data_dir)?;
    }
    let app_settings_path = app_data_dir.join("settings.json");
    let app_default_settings_path = app_data_dir.join("settings.default.json");
    if !app_settings_path.exists() {
        info!("[Init Settings] -> App settings file not exists, init it from config");
        let config_default_settings = app
            .path()
            .resolve("resources/settings.default.json", BaseDirectory::Resource)?;
        let _ = std::fs::copy(&config_default_settings, &app_settings_path);
        let _ = std::fs::copy(&config_default_settings, &app_default_settings_path);
        info!("[Init Settings] -> App settings file init done");
    } else {
        info!("[Init Settings] -> App settings file exists, skip init");
    }
    Ok(())
}

fn init_temp_dir(app: &AppHandle) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let temp_dir = app.path().app_cache_dir()?.join("picsharp_temp");
    if temp_dir.exists() {
        fs::remove_dir_all(&temp_dir)?;
    }
    fs::create_dir_all(&temp_dir)?;

    Ok(temp_dir)
}

#[cfg(desktop)]
fn allow_file_in_scopes(app: &AppHandle, files: Vec<PathBuf>) {
    let fs_scope = app.fs_scope();
    let asset_protocol_scope = app.asset_protocol_scope();
    for file in &files {
        if let Err(e) = fs_scope.allow_file(file) {
            error!(
                "[allow_file_in_scopes] -> Failed to allow <{}> in fs_scope: {}",
                file.to_string_lossy(),
                e
            );
        }
        if let Err(e) = asset_protocol_scope.allow_file(file) {
            error!(
                "[allow_file_in_scopes] -> Failed to allow <{}> in asset_protocol_scope: {}",
                file.to_string_lossy(),
                e
            );
        }
    }
}

#[cfg(desktop)]
fn set_window_open_with_files(app: &AppHandle, files: Vec<PathBuf>) {
    let files = files
        .into_iter()
        .map(|f| {
            let file = f.to_string_lossy().replace("\\", "\\\\");
            format!("\"{file}\"",)
        })
        .collect::<Vec<_>>()
        .join(",");
    if let Some(window) = app.get_webview_window("main") {
        let payload = format!("{{mode: \"ns_compress\", paths: [{}]}}", files);
        info!("[set_window_open_with_files] -> payload: {}", payload);
        let script = format!("window.LAUNCH_PAYLOAD = {};", payload);
        if let Err(e) = window.eval(&script) {
            error!(
                "[set_window_open_with_files] -> Failed to set open files variable: {}",
                e
            );
        }
    } else {
        error!("[set_window_open_with_files] -> Failed to get main window");
    }
}

#[allow(unused_variables)]
#[allow(dead_code)]
#[cfg(desktop)]
fn set_tray(app: &AppHandle) -> Result<(), tauri::Error> {
    let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&quit_i])?;
    let tray: tauri::tray::TrayIcon = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .icon_as_template(true)
        // .menu(&menu)
        .on_tray_icon_event(|tray, event| match event {
            TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } => {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            _ => {
                log::info!("unhandled event {event:?}");
            }
        })
        .build(app)
        .map_err(|e| {
            log::error!("Failed to build tray icon: {}", e);
            e
        })?;
    Ok(())
}

#[derive(Clone, serde::Serialize)]
#[allow(dead_code)]
struct Payload {
    args: Vec<String>,
    cwd: String,
}

fn get_files_from_argv(argv: Vec<String>) -> Vec<PathBuf> {
    let mut files = Vec::new();
    for (_, maybe_file) in argv.iter().enumerate().skip(1) {
        if maybe_file.starts_with("-") {
            continue;
        }
        if let Ok(url) = Url::parse(maybe_file) {
            if let Ok(path) = url.to_file_path() {
                files.push(path);
            } else {
                files.push(PathBuf::from(maybe_file))
            }
        } else {
            files.push(PathBuf::from(maybe_file))
        }
    }
    files
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            info!("Single instance init -> args: {:?}", args);
            info!("Single instance init -> cwd: {:?}", cwd);
            if let Some(window) = app.get_webview_window("main") {
                window.show().unwrap_or_else(|error| {
                    error!(
                        "[Single Instance Init] -> Failed to show main window: {}",
                        error
                    );
                });
                window.set_focus().unwrap_or_else(|error| {
                    error!(
                        "[Single Instance Init] -> Failed to set focus to main window: {}",
                        error
                    );
                });
                let files = get_files_from_argv(args.clone());
                if !files.is_empty() {
                    allow_file_in_scopes(app, files.clone());
                    app.emit(
                        "ns_compress",
                        files
                            .iter()
                            .map(|f| f.to_string_lossy().to_string())
                            .collect::<Vec<_>>(),
                    )
                    .unwrap_or_else(|error| {
                        error!(
                            "[Single Instance Emit] -> Failed to emit ns_compress event: {}",
                            error
                        );
                    });
                }
            }
        }))
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            match init_settings(&app.handle()) {
                Ok(()) => {
                    info!("[init_settings] -> Settings initialized");
                }
                Err(e) => {
                    error!("[init_settings] -> Settings init failed: {}", e);
                }
            }

            match init_temp_dir(&app.handle()) {
                Ok(temp_dir) => {
                    info!("[init_temp_dir] -> Temp dir initialized: {:?}", temp_dir);
                }
                Err(e) => {
                    error!("[init_temp_dir] -> Temp dir init failed: {}", e);
                }
            }

            let inspect = Inspect::new(app.handle().clone())?;
            file_ext::load(inspect);

            #[cfg(desktop)]
            {
                let files = get_files_from_argv(std::env::args().collect());
                if !files.is_empty() {
                    let app_handle = app.handle().clone();
                    allow_file_in_scopes(&app_handle, files.clone());
                    app.listen("window-ready", move |_| {
                        info!("[Setup] -> Launching with files: {:?}", files);
                        set_window_open_with_files(&app_handle, files.clone());
                    });
                }
            }
            app.handle()
                .emit("window-ready", ())
                .unwrap_or_else(|error| {
                    error!("[Setup] -> Failed to emit window-ready event: {}", error);
                });
            Ok(())
        })
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_upload::init())
        .plugin(tauri_plugin_http::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Stdout,
                ))
                .build(),
        )
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            file::ipc_parse_paths,
            file::ipc_count_valid_files,
            file::ipc_is_file_in_directory,
            file::ipc_copy_image,
            file::ipc_get_file_name,
            clipboard::ipc_parse_clipboard_images,
            // tinify::ipc_tinify,
            // image_processor::compressors::ipc_compress_images,
            // image_processor::compressors::ipc_compress_single_image,
            // image_processor::compressors::ipc_is_apng,
            command::ipc_open_system_preference_notifications,
            command::ipc_kill_processes_by_name,
            command::ipc_kill_picsharp_sidecar_processes,
            window::ipc_spawn_window,
        ])
        .build(tauri::generate_context!())
        .expect("Error while running Picsharp application")
        .run(|app, event| {
            if let tauri::RunEvent::WindowEvent {
                label,
                event: win_event,
                ..
            } = &event
            {
                match win_event {
                    tauri::WindowEvent::CloseRequested { api, .. } => {
                        if let Some(win) = app.get_webview_window(label.as_str()) {
                            if label == "main" {
                                win.hide().unwrap_or_else(|error| {
                                    error!(
                                        "[Close Requested] -> Failed to hide main window: {}",
                                        error
                                    );
                                });
                                api.prevent_close();
                            } else {
                                win.destroy().unwrap_or_else(|error| {
                                    error!(
                                        "[Close Requested] -> Failed to destroy the <{}> window",
                                        error
                                    );
                                });
                            }
                        }
                    }
                    _ => {}
                }
            }
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen {
                has_visible_windows,
                ..
            } = &event
            {
                if !has_visible_windows {
                    if let Some(window) = app.get_webview_window("main") {
                        window.show().unwrap_or_else(|error| {
                            error!("[Reopen Event] -> Failed to show main window: {}", error);
                        });
                        window.set_focus().unwrap_or_else(|error| {
                            error!(
                                "[Reopen Event] -> Failed to set focus to main window: {}",
                                error
                            );
                        });
                    }
                }
            }

            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = &event {
                let files = urls
                    .into_iter()
                    .filter_map(|url| url.to_file_path().ok())
                    .collect::<Vec<_>>();

                let app_handler_clone = app.clone();
                allow_file_in_scopes(app, files.clone());
                app.listen("window-ready", move |_| {
                    set_window_open_with_files(&app_handler_clone, files.clone());
                });
            }
        });
}
