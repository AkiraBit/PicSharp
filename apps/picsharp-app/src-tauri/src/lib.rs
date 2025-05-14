use inspect::Inspect;
use log::{error, info};
use std::fs;
use std::path::PathBuf;
use tauri::path::BaseDirectory;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};
use tauri::{AppHandle, Emitter, Listener, Manager};
use tauri_plugin_fs::FsExt;
mod command;
mod file;
mod file_ext;
// mod image_processor;
mod inspect;
// mod tinify;
mod upload;
mod window;

fn init_settings(app: &AppHandle) {
    let settings_path = app.path().app_data_dir().unwrap().join("settings.json");
    if !settings_path.exists() {
        let default_settings = app
            .path()
            .resolve("resources/settings.default.json", BaseDirectory::Resource)
            .unwrap();
        let app_default_settings_path = app
            .path()
            .app_data_dir()
            .unwrap()
            .join("settings.default.json");
        let _ = std::fs::copy(&default_settings, settings_path);
        let _ = std::fs::copy(&default_settings, app_default_settings_path);
    }
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
            eprintln!("Failed to allow file in fs_scope: {}", e);
        } else {
            println!("Allowed file in fs_scope: {:?}", file);
        }
        if let Err(e) = asset_protocol_scope.allow_file(file) {
            eprintln!("Failed to allow file in asset_protocol_scope: {}", e);
        } else {
            println!("Allowed file in asset_protocol_scope: {:?}", file);
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
    let window = app.get_webview_window("main").unwrap();
    let payload = format!("{{mode: \"ns_compress\", paths: [{}]}}", files);
    info!("[set_window_open_with_files] -> payload: {}", payload);
    let script = format!("window.LAUNCH_PAYLOAD = {};", payload);
    if let Err(e) = window.eval(&script) {
        error!(
            "[set_window_open_with_files] -> Failed to set open files variable: {}",
            e
        );
    }
}

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
            init_settings(&app.handle());

            match init_temp_dir(&app.handle()) {
                Ok(temp_dir) => {
                    info!("Temp dir initialized: {:?}", temp_dir);
                }
                Err(e) => {
                    error!("Temp dir init failed: {}", e);
                }
            }

            let inspect = Inspect::new(app.handle().clone())?;
            file_ext::load(inspect);

            log::info!("launch args: {:?}", std::env::args());
            #[cfg(any(windows, target_os = "linux"))]
            {
                let mut files = Vec::new();

                // NOTICE: `args` may include URL protocol (`your-app-protocol://`)
                // or arguments (`--`) if your app supports them.
                // files may aslo be passed as `file://path/to/file`
                for maybe_file in std::env::args().skip(1) {
                    // skip flags like -f or --flag
                    if maybe_file.starts_with('-') {
                        continue;
                    }

                    // handle `file://` path urls and skip other urls
                    if let Ok(url) = url::Url::parse(&maybe_file) {
                        if let Ok(path) = url.to_file_path() {
                            files.push(path);
                        }
                    } else {
                        files.push(PathBuf::from(maybe_file))
                    }
                }

                log::info!("parse files: {:?}", files);
                set_window_open_with_files(&app.handle(), files.clone());
            }

            // let args: Vec<String> = std::env::args().collect();
            // log::info!("Tauri launch args: {:?}", args);
            // set_tray(&app.handle());
            app.handle().emit("window-ready", ()).unwrap();
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
            // tinify::ipc_tinify,
            // image_processor::compressors::ipc_compress_images,
            // image_processor::compressors::ipc_compress_single_image,
            // image_processor::compressors::ipc_is_apng,
            command::ipc_open_system_preference_notifications,
            window::ipc_spawn_window,
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app, event| {
            if let tauri::RunEvent::WindowEvent {
                label,
                event: win_event,
                ..
            } = &event
            {
                match win_event {
                    tauri::WindowEvent::CloseRequested { api, .. } => {
                        let win = app.get_webview_window(label.as_str()).unwrap();
                        if label == "main" {
                            win.hide().unwrap();
                            api.prevent_close();
                        } else {
                            win.destroy().unwrap();
                        }
                    }
                    _ => {}
                }
            }

            if let tauri::RunEvent::Reopen {
                has_visible_windows,
                ..
            } = &event
            {
                if !has_visible_windows {
                    let window = app.get_webview_window("main").unwrap();
                    window.show().unwrap();
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
