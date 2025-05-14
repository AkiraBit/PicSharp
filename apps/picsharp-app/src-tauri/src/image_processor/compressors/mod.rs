pub mod avif;
pub mod jpeg;
pub mod png;
pub mod svg;
pub mod webp;

use crate::file::{
    convert_file_src, get_file_bytes_size, get_file_disk_size, get_file_extension, get_file_name,
};
use crate::image_processor::common::QualityMode;
use crate::image_processor::common::{
    get_output_path, CompressionError, CompressionOptions, CompressionOutputMode,
    CompressionResult, CompressionStatus,
};
use log::{error, info};
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use std::str::FromStr;
use std::sync::Arc;
use std::time::Instant;
use tauri::Emitter;
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_store::StoreExt;

use super::common::calculate_compress_rate;

fn compress_single_image(
    input_path: &Path,
    temp_dir: &PathBuf,
    options: &CompressionOptions,
) -> Result<CompressionResult, String> {
    let start = Instant::now();
    let input_path_str = input_path.to_string_lossy().to_string();

    // 检查文件是否存在
    if !input_path.exists() {
        return Err(CompressionError::FileNotFound(input_path_str).to_string());
    }

    let original_bytes_size = get_file_bytes_size(&input_path_str, None).unwrap_or(0);

    let output_path = get_output_path(input_path, options);
    let output_path_str = output_path.to_string_lossy().to_string();

    // 创建输出目录（如果不存在）
    if let Some(parent) = output_path.parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            return Err(CompressionError::Io(e).to_string());
        }
    }

    let mut original_temp_path = String::new();

    if temp_dir.exists() {
        let name = get_file_name(Path::new(input_path));
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();
        let random_num = rand::random::<u32>() % 10000;
        original_temp_path = temp_dir
            .join(format!("{}_{}_{}", timestamp, random_num, name))
            .to_string_lossy()
            .to_string();
        match std::fs::copy(input_path, original_temp_path.clone()) {
            Ok(_) => {}
            Err(e) => {
                error!("Failed to copy file to temp path: {}", e);
            }
        }
    }

    let result = match get_file_extension(input_path).as_str() {
        "png" => png::compress_png(
            input_path,
            &output_path,
            options.quality_level,
            Some(options.quality_mode),
        ),
        "jpg" | "jpeg" => jpeg::compress_jpeg(input_path, &output_path, options.quality_level),
        "webp" => webp::compress_webp(
            input_path,
            &output_path,
            options.quality_level,
            Some(options.quality_mode),
        ),
        // "avif" => avif::compress_avif(
        //     input_path,
        //     &output_path,
        //     options.quality_level,
        //     Some(options.quality_mode),
        // ),
        // "svg" => svg::compress_svg(input_path, &output_path),
        ext => Err(CompressionError::UnsupportedFormat(ext.to_string())),
    };

    match result {
        Ok(_) => {
            let compressed_bytes_size = get_file_bytes_size(&output_path_str, None).unwrap();
            let compressed_disk_size = get_file_disk_size(&output_path_str, None).unwrap();
            let duration = start.elapsed();
            let compress_result = CompressionResult {
                input_path: input_path_str.clone(),
                output_path_converted: convert_file_src(&output_path_str).unwrap_or_default(),
                compressed_bytes_size,
                compressed_disk_size,
                output_path: output_path_str.clone(),
                status: CompressionStatus::Success,
                error_message: None,
                compress_rate: calculate_compress_rate(original_bytes_size, compressed_bytes_size),
                cost_time: duration.as_millis() as u64,
                original_temp_path: convert_file_src(&original_temp_path).unwrap_or_default(),
            };

            Ok(compress_result)
        }
        Err(e) => Err(e.to_string()),
    }
}

/// 从存储中获取值的辅助函数
fn get_store_value<R: Runtime, T: serde::de::DeserializeOwned>(
    store: &tauri_plugin_store::Store<R>,
    key: &str,
    default_value: Value,
) -> T {
    let store_value = store.get(key);
    let value = store_value.unwrap_or_else(|| default_value.clone());
    serde_json::from_value(value).unwrap_or_else(|_| {
        serde_json::from_value(default_value).expect("默认值应该是可反序列化的")
    })
}

/// 从配置存储创建压缩选项
fn create_compression_options_from_store<R: Runtime>(
    app: &AppHandle<R>,
) -> Result<CompressionOptions, String> {
    let store = app.store("settings.json").map_err(|e| e.to_string())?;

    // 获取压缩等级
    let quality_level: u8 = get_store_value(
        &store,
        "compression_local_quality_level",
        Value::Number(serde_json::Number::from(4)),
    );

    // 获取压缩模式
    let quality_mode = get_store_value::<R, QualityMode>(
        &store,
        "compression_local_quality_mode",
        Value::String("lossy".to_string()),
    );

    // 获取输出模式
    let compression_tasks_output_mode: String = get_store_value(
        &store,
        "compression_tasks_output_mode",
        Value::String("overwrite".to_string()),
    );

    // 获取文件后缀
    let output_mode_save_as_file_suffix: String = get_store_value(
        &store,
        "compression_tasks_output_mode_save_as_file_suffix",
        Value::String("_compressed".to_string()),
    );

    // 获取输出文件夹
    let output_mode_save_to_folder: String = get_store_value(
        &store,
        "compression_tasks_output_mode_save_to_folder",
        Value::String("".to_string()),
    );

    // 获取是否开启压缩率限制设置
    let save_compress_rate_limit: bool = get_store_value(
        &store,
        "compression_tasks_save_compress_rate_limit",
        Value::Bool(false),
    );

    // 获取压缩率阈值
    let save_compress_rate_limit_threshold: f64 = get_store_value(
        &store,
        "compression_tasks_save_compress_rate_limit_threshold",
        Value::Number(serde_json::Number::from_f64(0.2).unwrap()),
    );

    // 获取保留的元数据
    let default_metadata = Value::Array(vec![
        Value::String("copyright".to_string()),
        Value::String("creator".to_string()),
        Value::String("location".to_string()),
    ]);

    let compression_retain_metadata_array: Vec<String> =
        get_store_value(&store, "compression_retain_metadata", default_metadata);

    Ok(CompressionOptions {
        output_mode: CompressionOutputMode::from_str(&compression_tasks_output_mode)
            .unwrap_or(CompressionOutputMode::Overwrite),
        output_mode_save_as_file_suffix,
        output_mode_save_to_folder,
        save_compress_rate_limit,
        save_compress_rate_limit_threshold,
        retain_metadata: compression_retain_metadata_array,
        quality_level,
        quality_mode,
    })
}

/// 处理图片压缩任务
fn process_compression_tasks<R: Runtime>(
    app: &AppHandle<R>,
    webview_window: &tauri::WebviewWindow,
    paths: Vec<PathBuf>,
    options: Arc<CompressionOptions>,
) -> Vec<CompressionResult> {
    let temp_dir = match app.path().app_cache_dir() {
        Ok(path) => {
            let temp_dir = path.join("picsharp_temp");
            if temp_dir.exists() {
                temp_dir
            } else {
                fs::create_dir_all(temp_dir.clone()).unwrap();
                temp_dir
            }
        }
        Err(e) => {
            error!("Failed to get temp dir: {}", e);
            PathBuf::new()
        }
    };
    paths
        .par_iter()
        .map(|path| {
            let result = match compress_single_image(path, &temp_dir, &options) {
                Ok(result) => result,
                Err(e) => CompressionResult {
                    input_path: path.to_string_lossy().to_string(),
                    output_path_converted: path.to_string_lossy().to_string(),
                    compressed_bytes_size: 0,
                    compressed_disk_size: 0,
                    output_path: "".to_string(),
                    status: CompressionStatus::Failed,
                    error_message: Some(e.to_string()),
                    compress_rate: 0.0,
                    cost_time: 0,
                    original_temp_path: "".to_string(),
                },
            };

            // 通过Tauri事件发送进度更新
            let _ = webview_window.emit("compression-progress", serde_json::json!(result));

            result
        })
        .collect()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IpcCompressionOptions {
    optimize_level: u8,
    quality: Option<u8>,
}

#[tauri::command]
pub async fn ipc_is_apng(path: String) -> Result<bool, String> {
    let path: PathBuf = PathBuf::from(path);

    if !path.exists() {
        return Err(format!("File not found: {}", path.display()));
    }

    // 检查文件是否可访问
    match std::fs::metadata(&path) {
        Ok(metadata) => {
            if !metadata.is_file() {
                return Err(format!("Path is not a file: {}", path.display()));
            }
        }
        Err(e) => {
            return Err(format!(
                "Cannot access file: {}, error: {}",
                path.display(),
                e
            ));
        }
    }

    let is_apng = png::is_apng(&path);
    Ok(is_apng)
}

#[tauri::command]
pub async fn ipc_compress_images<R: Runtime>(
    app: AppHandle<R>,
    webview_window: tauri::WebviewWindow,
    paths: Vec<String>,
) -> Result<(), String> {
    // 从存储创建压缩选项
    let compression_options = create_compression_options_from_store(&app)?;

    // 将路径字符串转换为PathBuf
    let paths: Vec<PathBuf> = paths.iter().map(PathBuf::from).collect();

    // 使用Arc包装选项以便在多线程环境中共享
    let options_arc = Arc::new(compression_options);

    // 处理压缩任务
    let results = process_compression_tasks(&app, &webview_window, paths, options_arc);
    // 发送所有处理完成的事件
    webview_window
        .emit("compression-completed", serde_json::json!(results))
        .unwrap();

    Ok(())
}

#[tauri::command]
pub async fn ipc_compress_single_image<R: Runtime>(
    app: AppHandle<R>,
    path: String,
) -> Result<CompressionResult, String> {
    let compression_options = create_compression_options_from_store(&app)?;
    let path: PathBuf = PathBuf::from(path);
    let temp_dir = match app.path().app_cache_dir() {
        Ok(path) => {
            let temp_dir = path.join("picsharp_temp");
            if temp_dir.exists() {
                temp_dir
            } else {
                fs::create_dir_all(temp_dir.clone()).unwrap();
                temp_dir
            }
        }
        Err(e) => {
            error!("Failed to get temp dir: {}", e);
            PathBuf::new()
        }
    };
    let results =
        compress_single_image(&path, &temp_dir, &compression_options).map_err(|e| e.to_string())?;
    Ok(results)
}
