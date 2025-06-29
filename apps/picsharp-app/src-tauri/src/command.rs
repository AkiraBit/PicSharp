use log::{error, info};
use std::process::Command;
use tauri::ipc::Response;
use tauri::{command, Manager};
use tauri::{AppHandle, Runtime};

#[cfg(target_os = "macos")]
#[command]
pub async fn ipc_open_system_preference_notifications() -> Response {
    match Command::new("open")
        .arg("x-apple.systempreferences:com.apple.preference.notifications")
        .spawn()
    {
        Ok(_) => {
            info!("Successfully opened Notifications settings");
            Response::new(
                serde_json::json!({
                    "success": true,
                })
                .to_string(),
            )
        }
        Err(e) => {
            let error_msg = format!("Failed to open Notifications settings on macOS: {}", e);
            error!("{}", error_msg);
            Response::new(
                serde_json::json!({
                    "success": false,
                    "error": error_msg
                })
                .to_string(),
            )
        }
    }
}

#[cfg(target_os = "windows")]
#[command]
pub async fn ipc_open_system_preference_notifications() -> Response {
    let methods = vec![
        ("explorer", vec!["ms-settings:notifications"]),
        ("start", vec!["ms-settings:notifications"]),
        ("cmd", vec!["/c", "start", "ms-settings:notifications"]),
    ];

    for (cmd, args) in methods {
        match Command::new(cmd).args(&args).spawn() {
            Ok(_) => {
                info!("Successfully opened Notifications settings on Windows");
                return Response::new(
                    serde_json::json!({
                        "success": true,
                    })
                    .to_string(),
                );
            }
            Err(e) => {
                let error_msg = format!("Failed to open Notifications settings on Windows: {}", e);
                error!("{}", error_msg);
                return Response::new(
                    serde_json::json!({
                        "success": false,
                        "error": error_msg
                    })
                    .to_string(),
                );
            }
        }
    }

    let error_msg = "Failed to open Notifications settings on Windows. Please open Settings > System > Notifications manually.".to_string();
    error!("{}", error_msg);
    Response::new(
        serde_json::json!({
            "success": false,
            "error": error_msg
        })
        .to_string(),
    )
}

#[cfg(target_os = "linux")]
#[command]
pub async fn ipc_open_system_preference_notifications() -> Response {
    // Detect desktop environment
    let desktop_env = std::env::var("XDG_CURRENT_DESKTOP")
        .or_else(|_| std::env::var("DESKTOP_SESSION"))
        .unwrap_or_default()
        .to_lowercase();

    // Define commands for different desktop environments
    let commands = match desktop_env.as_str() {
        env if env.contains("gnome") => vec![
            ("gnome-control-center", vec!["notifications"]),
            ("/usr/bin/gnome-control-center", vec!["notifications"]),
        ],
        env if env.contains("kde") || env.contains("plasma") => vec![
            ("systemsettings5", vec!["kcm_notifications"]),
            ("kcmshell5", vec!["kcm_notifications"]),
        ],
        env if env.contains("xfce") => vec![
            ("xfce4-notifyd-config", vec![]),
            ("xfce4-settings-manager", vec!["-s", "xfce4-notifyd"]),
        ],
        env if env.contains("mate") => vec![
            ("mate-notification-properties", vec![]),
            ("mate-control-center", vec!["notifications"]),
        ],
        env if env.contains("cinnamon") => vec![
            ("cinnamon-settings", vec!["notifications"]),
            ("/usr/bin/cinnamon-settings", vec!["notifications"]),
        ],
        env if env.contains("lxqt") => vec![("lxqt-config-notificationd", vec![])],
        _ => vec![
            // Fallback: try common commands
            ("gnome-control-center", vec!["notifications"]),
            ("systemsettings5", vec!["kcm_notifications"]),
            ("xfce4-notifyd-config", vec![]),
            ("mate-notification-properties", vec![]),
            ("cinnamon-settings", vec!["notifications"]),
        ],
    };

    // Try each command until one succeeds
    for (cmd, args) in commands {
        match Command::new(cmd).args(&args).spawn() {
            Ok(_) => {
                return Response::new(
                    serde_json::json!({
                        "success": true,
                    })
                    .to_string(),
                );
            }
            Err(_) => continue,
        }
    }

    // If all commands fail, try to open generic settings
    let fallback_commands = vec![
        ("gnome-control-center", vec![]),
        ("systemsettings5", vec![]),
        ("xfce4-settings-manager", vec![]),
        ("mate-control-center", vec![]),
        ("cinnamon-settings", vec![]),
        ("lxqt-config", vec![]),
    ];

    for (cmd, args) in fallback_commands {
        match Command::new(cmd).args(&args).spawn() {
            Ok(_) => {
                return Response::new(
                    serde_json::json!({
                        "success": true,
                    })
                    .to_string(),
                );
            }
            Err(_) => continue,
        }
    }

    Response::new(serde_json::json!({
        "success": false,
        "error": format!(
            "Failed to open Notifications settings on Linux. Desktop environment: {}. Please open your system settings and navigate to Notifications manually.",
            desktop_env
        )
    }).to_string())
}

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
#[command]
pub async fn ipc_open_system_preference_notifications() -> Response {
    Ok(serde_json::json!({
        "success": false,
        "error": "Opening system notification settings is not supported on this platform"
    }))
}

pub async fn kill_processes_by_name(process_name_pattern: &str) -> Result<String, String> {
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    {
        use std::process::Command;

        let current_pid = std::process::id();

        let pgrep_output = Command::new("pgrep")
            .arg("-f")
            .arg(process_name_pattern)
            .output();

        match pgrep_output {
            Ok(output) => {
                if output.status.success() {
                    let pids_str = String::from_utf8_lossy(&output.stdout);
                    let pids: Vec<&str> = pids_str
                        .trim()
                        .split('\n')
                        .filter(|&s| !s.is_empty())
                        .collect();

                    if pids.is_empty() {
                        return Ok(format!(
                            "No processes found containing '{}'",
                            process_name_pattern
                        ));
                    }

                    let mut killed_count = 0;
                    let mut errors = Vec::new();

                    for pid_str in pids {
                        if let Ok(pid) = pid_str.parse::<u32>() {
                            if pid == current_pid {
                                continue;
                            }

                            let kill_result = Command::new("kill").arg("-9").arg(pid_str).output();

                            match kill_result {
                                Ok(kill_output) => {
                                    if kill_output.status.success() {
                                        killed_count += 1;
                                    } else {
                                        let error_msg =
                                            String::from_utf8_lossy(&kill_output.stderr);
                                        errors.push(format!(
                                            "Failed to kill process {}: {}",
                                            pid, error_msg
                                        ));
                                    }
                                }
                                Err(e) => {
                                    errors.push(format!("Failed to execute kill command: {}", e));
                                }
                            }
                        }
                    }

                    let mut result = format!(
                        "Successfully killed {} processes containing '{}'",
                        killed_count, process_name_pattern
                    );
                    if !errors.is_empty() {
                        result.push_str(&format!("\nErrors:\n{}", errors.join("\n")));
                    }
                    Ok(result)
                } else {
                    Ok(format!(
                        "No processes found containing '{}'",
                        process_name_pattern
                    ))
                }
            }
            Err(e) => Err(format!("Failed to execute pgrep command: {}", e)),
        }
    }

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;

        let tasklist_output = Command::new("tasklist")
            .arg("/FI")
            .arg(&format!("IMAGENAME eq *{}*", process_name_pattern))
            .arg("/FO")
            .arg("CSV")
            .output();

        match tasklist_output {
            Ok(output) => {
                if output.status.success() {
                    let output_str = String::from_utf8_lossy(&output.stdout);
                    let lines: Vec<&str> = output_str.lines().collect();

                    let mut killed_count = 0;
                    let mut errors = Vec::new();

                    for line in lines.iter().skip(1) {
                        if line.contains(process_name_pattern) {
                            let parts: Vec<&str> = line.split(',').collect();
                            if parts.len() > 0 {
                                let process_name = parts[0].trim_matches('"');

                                let kill_result = Command::new("taskkill")
                                    .arg("/F")
                                    .arg("/IM")
                                    .arg(process_name)
                                    .output();

                                match kill_result {
                                    Ok(kill_output) => {
                                        if kill_output.status.success() {
                                            killed_count += 1;
                                        } else {
                                            let error_msg =
                                                String::from_utf8_lossy(&kill_output.stderr);
                                            errors.push(format!(
                                                "Failed to kill process {}: {}",
                                                process_name, error_msg
                                            ));
                                        }
                                    }
                                    Err(e) => {
                                        errors.push(format!(
                                            "Failed to execute taskkill command: {}",
                                            e
                                        ));
                                    }
                                }
                            }
                        }
                    }

                    if killed_count == 0 && errors.is_empty() {
                        Ok(format!(
                            "No processes found containing '{}'",
                            process_name_pattern
                        ))
                    } else {
                        let mut result = format!(
                            "Successfully killed {} processes containing '{}'",
                            killed_count, process_name_pattern
                        );
                        if !errors.is_empty() {
                            result.push_str(&format!("\nErrors:\n{}", errors.join("\n")));
                        }
                        Ok(result)
                    }
                } else {
                    Ok(format!(
                        "No processes found containing '{}'",
                        process_name_pattern
                    ))
                }
            }
            Err(e) => Err(format!("Failed to execute tasklist command: {}", e)),
        }
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    {
        Err("This operation is not supported on the current platform".to_string())
    }
}

#[command]
pub async fn ipc_kill_processes_by_name(process_name_pattern: String) -> Result<String, String> {
    kill_processes_by_name(&process_name_pattern).await
}

#[command]
pub async fn ipc_kill_picsharp_sidecar_processes() -> Result<String, String> {
    kill_processes_by_name("picsharp-sidecar").await
}

#[command]
pub async fn ipc_open_devtool<R: Runtime>(app: AppHandle<R>) -> Response {
    match app.get_webview_window("main") {
        Some(main_window) => {
            main_window.open_devtools();
            Response::new(
                serde_json::json!({
                    "success": true,
                })
                .to_string(),
            )
        }
        None => Response::new(
            serde_json::json!({
                "success": false,
                "error": "Failed to open devtool"
            })
            .to_string(),
        ),
    }
}
