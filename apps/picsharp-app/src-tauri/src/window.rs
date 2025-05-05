use log::info;
use merge::Merge;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicUsize, Ordering};
use tauri::{AppHandle, TitleBarStyle, WebviewUrl, WebviewWindow};

static ID: AtomicUsize = AtomicUsize::new(0);

#[derive(Debug, Serialize, Deserialize, Clone, Merge)]
pub struct WindowConfig {
    #[merge(strategy = merge::option::overwrite_none)]
    label: Option<String>,
    #[merge(strategy = merge::option::overwrite_none)]
    title: Option<String>,
    #[merge(strategy = merge::option::overwrite_none)]
    width: Option<f64>,
    #[merge(strategy = merge::option::overwrite_none)]
    height: Option<f64>,
    #[merge(strategy = merge::option::overwrite_none)]
    min_width: Option<f64>,
    #[merge(strategy = merge::option::overwrite_none)]
    min_height: Option<f64>,
    #[merge(strategy = merge::option::overwrite_none)]
    resizable: Option<bool>,
    #[merge(strategy = merge::option::overwrite_none)]
    hidden_title: Option<bool>,
    #[merge(strategy = merge::option::overwrite_none)]
    maximizable: Option<bool>,
    #[merge(strategy = merge::option::overwrite_none)]
    minimizable: Option<bool>,
    #[merge(strategy = merge::option::overwrite_none)]
    title_bar_style: Option<TitleBarStyle>,
    #[merge(strategy = merge::option::overwrite_none)]
    center: Option<bool>,
}

impl Default for WindowConfig {
    fn default() -> Self {
        Self {
            label: Some(format!("PicSharp-{}", ID.fetch_add(1, Ordering::Relaxed))),
            title: Some("PicSharp".to_string()),
            width: Some(1002.0),
            height: Some(670.0),
            min_width: Some(100.0),
            min_height: Some(100.0),
            resizable: Some(true),
            hidden_title: Some(true),
            maximizable: Some(true),
            minimizable: Some(true),
            title_bar_style: Some(TitleBarStyle::Overlay),
            center: Some(true),
        }
    }
}

pub fn spawn_window(
    app: &AppHandle,
    launch_payload: Option<String>,
    window_config: Option<WindowConfig>,
) -> tauri::Result<bool> {
    let launch_payload = launch_payload.unwrap_or("undefined".to_string());
    let mut window_config = window_config.unwrap_or_default();
    let default_window_config = WindowConfig::default();

    window_config.merge(default_window_config);

    let label = window_config.label.clone().unwrap_or_default();
    let args: String = format!("window.LAUNCH_PAYLOAD = {};", launch_payload);
    info!("[spawn_window] -> launch_payload: {}", launch_payload);
    info!("[spawn_window] -> url: {}", WebviewUrl::default());
    let mut window = WebviewWindow::builder(app, &label, WebviewUrl::default())
        .title(window_config.title.unwrap_or_default())
        .inner_size(
            window_config.width.unwrap_or_default(),
            window_config.height.unwrap_or_default(),
        )
        .min_inner_size(
            window_config.min_width.unwrap_or_default(),
            window_config.min_height.unwrap_or_default(),
        )
        .maximizable(window_config.maximizable.unwrap_or_default())
        .minimizable(window_config.minimizable.unwrap_or_default())
        .hidden_title(window_config.hidden_title.unwrap_or_default())
        .resizable(window_config.resizable.unwrap_or_default())
        .title_bar_style(window_config.title_bar_style.unwrap_or_default());
    if window_config.center.unwrap_or_default() {
        window = window.center();
    }
    window.build()?.eval(&args)?;
    Ok(true)
}

#[tauri::command]
pub async fn ipc_spawn_window(
    app: AppHandle,
    launch_payload: Option<String>,
    window_config: Option<WindowConfig>,
) -> tauri::Result<bool> {
    spawn_window(&app, launch_payload, window_config)
}
