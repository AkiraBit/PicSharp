use crate::file::{convert_file_src, get_file_disk_size, get_file_mime_type, get_file_name};
use crate::image_processor::common::calculate_compress_rate;
use crate::upload::{download_file, upload_file};
use base64::{engine::general_purpose::STANDARD, Engine};
use log::error;
use rand::seq::SliceRandom;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::path::Path;
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_store::StoreExt;

#[derive(Debug, thiserror::Error)]
pub enum TinifyError {
    #[error("Upload failed: {0}")]
    Upload(String),
    #[error("Download failed: {0}")]
    Download(String),
    #[error("No available API key")]
    NoApiKey,
    #[error("API key validation failed: {0}")]
    ApiKeyValidation(String),
    #[error("TinyPNG API returned error: {0}")]
    ApiError(String),
    #[error("Failed to parse JSON response: {0}")]
    JsonParse(#[from] serde_json::Error),
    #[error("Store operation failed: {0}")]
    StoreError(String),
    #[error("File operation failed: {0}")]
    FileIOError(String),
}

impl Serialize for TinifyError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

type Result<T> = std::result::Result<T, TinifyError>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TinifyApiKey {
    pub api_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TinifyOptions {
    pub preserve: Option<Vec<String>>,
    // pub resize: Option<TinifyResizeOptions>,
    // pub convert: Option<TinifyConvertOptions>,
}

impl Default for TinifyOptions {
    fn default() -> Self {
        Self {
            preserve: None,
            // resize: None,
            // convert: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TinifyResizeOptions {
    pub method: String, // "scale", "fit", "cover", "thumb"
    pub width: Option<u32>,
    pub height: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TinifyConvertOptions {
    pub r#type: String,             // "image/webp", "image/jpeg", "image/png" 等
    pub background: Option<String>, // 当转换为JPEG时，可以设置背景色
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TinifyResult {
    pub input_path: String,
    pub original_bytes_size: u64,
    pub compressed_bytes_size: u64,
    pub compressed_disk_size: u64,
    pub compress_rate: f64,
    pub output_path: String,
    pub output_path_converted: String,
    pub original_temp_path: String,
}

/// 从应用存储中随机获取一个可用的API密钥
fn get_random_api_key<R: Runtime>(app: &AppHandle<R>) -> Result<String> {
    let store = app
        .store("settings.json")
        .map_err(|e| TinifyError::StoreError(e.to_string()))?;

    let api_keys_value = store
        .get("compression_tinypng_api_keys")
        .unwrap_or(Value::Array(vec![]));

    let api_keys: Vec<TinifyApiKey> =
        serde_json::from_value(api_keys_value).map_err(|e| TinifyError::JsonParse(e))?;

    if api_keys.is_empty() {
        return Err(TinifyError::NoApiKey);
    }

    // 随机选择一个API密钥
    let mut rng = rand::thread_rng();
    if let Some(key) = api_keys.choose(&mut rng) {
        Ok(key.api_key.clone())
    } else {
        Err(TinifyError::NoApiKey)
    }
}

/// 使用TinyPNG API压缩图片
pub async fn compress_with_tinify<R: Runtime>(
    app: &AppHandle<R>,
    input_path: &str,
    output_path: &str,
    mime: String,
    options: Option<TinifyOptions>,
    save_compress_rate_limit: bool,
    save_compress_rate_limit_threshold: f64,
) -> Result<TinifyResult> {
    let api_key = get_random_api_key(app)?;
    let api_key_base64 = STANDARD.encode(format!("api:{}", api_key));

    let mut headers = HashMap::new();
    headers.insert(
        "Authorization".to_string(),
        format!("Basic {}", api_key_base64),
    );
    headers.insert("Content-Type".to_string(), mime);

    let response = upload_file("https://api.tinify.com/shrink", input_path, "POST", headers)
        .await
        .map_err(|e| TinifyError::Upload(e.to_string()))?;

    // 解析上传响应
    let response_json: Value = serde_json::from_str(&response)?;

    // 检查是否有错误
    if let Some(error) = response_json.get("error") {
        let message = error
            .get("message")
            .and_then(|m| m.as_str())
            .unwrap_or("unknown error");
        return Err(TinifyError::ApiError(message.to_string()));
    }

    let original_size = response_json
        .get("input")
        .and_then(|o| o.get("size"))
        .and_then(|s| s.as_u64())
        .unwrap_or(0);

    let compressed_size = response_json
        .get("output")
        .and_then(|o| o.get("size"))
        .and_then(|s| s.as_u64())
        .unwrap_or(0);

    // 获取压缩后图片的URL
    let output_url = if let Some(url) = response_json
        .get("output")
        .and_then(|o| o.get("url"))
        .and_then(|u| u.as_str())
    {
        url.to_string()
    } else {
        return Err(TinifyError::ApiError(
            "Cannot get the compressed image URL".to_string(),
        ));
    };

    // 计算压缩率
    let compress_rate = if compressed_size < original_size {
        calculate_compress_rate(original_size, compressed_size)
    } else {
        0.0
    };
    let mut original_temp_path = String::new();

    match app.path().app_cache_dir() {
        Ok(path) => {
            let temp_dir = path.join("picsharp_temp");
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
        }
        Err(e) => {
            error!("Failed to get app cache dir: {}", e);
        }
    };

    // 综合判断是否使用压缩后的文件：
    // 1. 文件必须变小
    // 2. 如果启用了压缩率限制，压缩率必须高于阈值
    let use_compressed_file = compressed_size < original_size
        && (!save_compress_rate_limit || compress_rate >= save_compress_rate_limit_threshold);

    if use_compressed_file {
        // 使用压缩后的文件
        let mut download_headers = HashMap::new();
        download_headers.insert("Content-Type".to_string(), "application/json".to_string());
        download_headers.insert(
            "Authorization".to_string(),
            format!("Basic {}", api_key_base64),
        );

        // 将options序列化为JSON字符串
        let options_param = options
            .as_ref()
            .map(|opts| serde_json::to_string(opts).unwrap_or_else(|_| String::from("{}")));

        download_file(
            &output_url,
            output_path,
            download_headers,
            // TODO: 设置为options_param
            Some("".to_string()),
        )
        .await
        .map_err(|e| TinifyError::Download(e.to_string()))?;
    } else {
        if output_path != input_path {
            // 使用原始文件
            tokio::fs::copy(input_path, output_path)
                .await
                .map_err(|e| TinifyError::FileIOError(e.to_string()))?;
        }
    }

    Ok(TinifyResult {
        input_path: input_path.to_string(),
        original_bytes_size: original_size,
        compressed_bytes_size: compressed_size,
        compressed_disk_size: get_file_disk_size(output_path, None).unwrap_or(0),
        compress_rate,
        output_path: output_path.to_string(),
        output_path_converted: convert_file_src(output_path).unwrap_or_default(),
        original_temp_path: convert_file_src(original_temp_path.as_str()).unwrap_or_default(),
    })
}

/// 从存储中获取压缩配置
fn get_compression_config<R: Runtime>(
    app: &AppHandle<R>,
) -> std::result::Result<CompressionConfig, String> {
    let store = app.store("settings.json").map_err(|e| e.to_string())?;

    // 获取输出模式
    let output_mode_str: String = store
        .get("compression_tasks_output_mode")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .unwrap_or("overwrite".to_string());

    // 获取文件后缀
    let output_suffix: String = store
        .get("compression_tasks_output_mode_save_as_file_suffix")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .unwrap_or("_compressed".to_string());

    // 获取输出文件夹
    let output_folder: String = store
        .get("compression_tasks_output_mode_save_to_folder")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .unwrap_or("".to_string());

    // 获取是否开启压缩率限制
    let save_compress_rate_limit: bool = store
        .get("compression_tasks_save_compress_rate_limit")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    // 获取压缩率阈值
    let save_compress_rate_limit_threshold: f64 = store
        .get("compression_tasks_save_compress_rate_limit_threshold")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.2);

    // 获取保留的元数据
    let retain_metadata: Vec<String> = store
        .get("compression_retain_metadata")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_else(|| {
            vec![
                "copyright".to_string(),
                "creator".to_string(),
                "location".to_string(),
            ]
        });

    Ok(CompressionConfig {
        output_mode: output_mode_str,
        output_suffix,
        output_folder,
        save_compress_rate_limit,
        save_compress_rate_limit_threshold,
        retain_metadata,
    })
}

/// 计算输出文件路径
fn calculate_output_path(input_path: &Path, config: &CompressionConfig) -> String {
    match config.output_mode.as_str() {
        "save_as_new_file" => {
            // 获取文件名和扩展名
            let parent = input_path.parent().unwrap_or_else(|| Path::new(""));
            let file_stem = input_path.file_stem().unwrap_or_default().to_string_lossy();
            let extension = input_path
                .extension()
                .map_or("".to_string(), |ext| format!(".{}", ext.to_string_lossy()));

            format!(
                "{}{}{}{}",
                parent.to_string_lossy(),
                std::path::MAIN_SEPARATOR,
                file_stem,
                config.output_suffix
            ) + &extension
        }
        "save_to_new_folder" if !config.output_folder.is_empty() => {
            let file_name = input_path.file_name().unwrap_or_default().to_string_lossy();
            format!(
                "{}{}{}",
                config.output_folder,
                std::path::MAIN_SEPARATOR,
                file_name
            )
        }
        _ => {
            // 默认覆盖原文件
            input_path.to_string_lossy().to_string()
        }
    }
}

/// 压缩配置
#[derive(Debug, Clone)]
struct CompressionConfig {
    output_mode: String,
    output_suffix: String,
    output_folder: String,
    save_compress_rate_limit: bool,
    save_compress_rate_limit_threshold: f64,
    retain_metadata: Vec<String>,
}

#[tauri::command]
pub async fn ipc_tinify<R: Runtime>(
    app: AppHandle<R>,
    input_path: String,
) -> std::result::Result<TinifyResult, String> {
    // 校验输入文件是否存在和可访问
    let input_file = Path::new(&input_path);
    if !input_file.exists() {
        return Err(format!("File not found"));
    }

    // 检查文件可读性
    match std::fs::metadata(&input_path) {
        Ok(metadata) => {
            if !metadata.is_file() {
                return Err(format!("Path is not a file"));
            }
            // 文件存在且是一个文件
        }
        Err(_) => {
            return Err(format!("Cannot access input file"));
        }
    }

    // 获取压缩配置
    let config = get_compression_config(&app)?;

    // 计算输出路径
    let final_output_path = calculate_output_path(input_file, &config);

    // 确保输出目录存在
    if let Some(parent) = Path::new(&final_output_path).parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Create output directory failed: {}", e))?;
        }
    }

    // 将保留元数据选项应用到TinifyOptions
    let mut tinify_opts = TinifyOptions::default();
    tinify_opts.preserve = Some(config.retain_metadata.clone());

    // 调用压缩函数
    let result = compress_with_tinify(
        &app,
        &input_path,
        &final_output_path,
        get_file_mime_type(&input_file).unwrap_or_default(),
        Some(tinify_opts),
        config.save_compress_rate_limit,
        config.save_compress_rate_limit_threshold,
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(result)
}
