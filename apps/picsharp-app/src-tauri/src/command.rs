use std::process::Command;
use tauri::command;

#[cfg(target_os = "macos")]
#[command]
pub async fn ipc_open_system_preference_notifications() {
    Command::new("open")
        .arg("x-apple.systempreferences:com.apple.preference.notifications")
        .spawn()
        .expect("failed to open Notifications settings");
}

#[cfg(not(target_os = "macos"))]
#[command]
pub async fn ipc_open_system_preference_notifications() {
    println!("Not supported on this platform");
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
