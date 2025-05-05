use std::process::Command;
use tauri::command;

#[cfg(target_os = "macos")]
#[command]
pub fn ipc_open_system_preference_notifications() {
    Command::new("open")
        .arg("x-apple.systempreferences:com.apple.preference.notifications")
        .spawn()
        .expect("failed to open Notifications settings");
}

#[cfg(not(target_os = "macos"))]
#[command]
pub fn ipc_open_system_preference_notifications() {
    println!("Not supported on this platform");
}
