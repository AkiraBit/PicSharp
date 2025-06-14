use arboard::Clipboard;
use image::{ImageBuffer, ImageFormat, ImageReader, Rgba};
use log::{error, info};
use reqwest;
use std::fs;
use std::io::{Cursor, Write};
use std::path::{Path, PathBuf};
use tauri::ipc::Response;
use tauri::{AppHandle, Runtime};
use url::Url;

fn detect_image_format(image_data: &[u8]) -> Option<ImageFormat> {
    let cursor = Cursor::new(image_data);
    let reader = ImageReader::new(cursor);
    if let Ok(reader_with_format) = reader.with_guessed_format() {
        return reader_with_format.format();
    }
    None
}

fn format_to_extension(format: ImageFormat) -> &'static str {
    match format {
        ImageFormat::Png => "png",
        ImageFormat::Jpeg => "jpg",
        ImageFormat::Gif => "gif",
        ImageFormat::WebP => "webp",
        ImageFormat::Tiff => "tiff",
        ImageFormat::Avif => "avif",
        _ => "png",
    }
}

// BGRA -> RGBA
fn convert_bgra_to_rgba(bgra_data: &[u8]) -> Vec<u8> {
    let mut rgba_data = Vec::with_capacity(bgra_data.len());

    for chunk in bgra_data.chunks_exact(4) {
        if chunk.len() == 4 {
            rgba_data.push(chunk[0]); // R
            rgba_data.push(chunk[1]); // G
            rgba_data.push(chunk[2]); // B
            rgba_data.push(chunk[3]); // A
        }
    }

    rgba_data
}

fn save_rgba_image_to_temp(
    image_data: &arboard::ImageData,
    candidate_format: &str,
    temp_dir: &PathBuf,
) -> Result<String, Box<dyn std::error::Error>> {
    let width = image_data.width as u32;
    let height = image_data.height as u32;
    let rgba_data = &image_data.bytes;

    let expected_len = (width * height * 4) as usize;
    if rgba_data.len() != expected_len {
        return Err(format!(
            "Image data length mismatch: expected {} bytes ({}x{}x4), actual {} bytes",
            expected_len,
            width,
            height,
            rgba_data.len()
        )
        .into());
    }

    // let processed_data = convert_bgra_to_rgba(rgba_data);

    let Some(img_buffer) = ImageBuffer::<Rgba<u8>, _>::from_raw(width, height, rgba_data.to_vec())
    else {
        let error_message = format!("Failed to create ImageBuffer from raw data");
        error!("{}", error_message);
        return Err(error_message.into());
    };

    let file_name = format!(
        "PicSharp_Clipboard_{}.{}",
        nanoid::nanoid!(),
        candidate_format
    );
    let temp_path = temp_dir.join(file_name);

    img_buffer.save_with_format(
        &temp_path,
        ImageFormat::from_extension(candidate_format).unwrap_or(ImageFormat::Png),
    )?;

    Ok(temp_path.to_string_lossy().to_string())
}

fn save_image_data_to_temp(image_data: &[u8]) -> Result<String, Box<dyn std::error::Error>> {
    let detected_format = detect_image_format(image_data);

    let cursor = Cursor::new(image_data);
    let reader = ImageReader::new(cursor).with_guessed_format()?;
    let dynamic_image = reader.decode()?;

    let (save_format, extension) = match detected_format {
        Some(format) => (format, format_to_extension(format)),
        None => (ImageFormat::Png, "png"),
    };

    let temp_dir = std::env::temp_dir();
    let file_name = format!("picsharp_clipboard_{}.{}", nanoid::nanoid!(), extension);
    let temp_path = temp_dir.join(file_name);

    dynamic_image.save_with_format(&temp_path, save_format)?;

    Ok(temp_path.to_string_lossy().to_string())
}

async fn download_image_from_url(url: &Url) -> Result<String, Box<dyn std::error::Error>> {
    let response = reqwest::get(url.as_str()).await?;

    if !response.status().is_success() {
        return Err(format!("Failed to download image from URL: {}", response.status()).into());
    }

    let image_data = response.bytes().await?;
    info!(
        "[download_image_from_url] Downloaded image from URL: {} (size: {} bytes)",
        url,
        image_data.len()
    );

    save_image_data_to_temp(&image_data)
}

fn is_image_url(url: &Url) -> bool {
    let path = url.path().to_lowercase();
    let image_extensions = ["jpg", "jpeg", "png", "gif", "webp", "tiff", "avif"];

    if let Some(extension) = path.split('.').last() {
        if image_extensions.contains(&extension) {
            return true;
        }
    }

    // check common image hosts
    if let Some(host) = url.host_str() {
        let image_hosts = [
            "imgur.com",
            "i.imgur.com",
            "github.com",
            "raw.githubusercontent.com",
            "unsplash.com",
            "images.unsplash.com",
            "pixabay.com",
            "cdn.pixabay.com",
            "pexels.com",
            "images.pexels.com",
        ];

        for host_pattern in &image_hosts {
            if host.contains(host_pattern) {
                return true;
            }
        }
    }

    false
}

// parse file paths (support multiple paths, separated by newlines)
fn parse_file_paths(text: &str) -> Vec<String> {
    text.lines()
        .map(|line| line.trim())
        .filter(|line| !line.is_empty())
        .map(|line| line.to_string())
        .collect()
}

// canonicalize path
fn canonicalize_path(path_str: &str) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let path = Path::new(path_str);

    // handle UNC paths and drive letters on Windows
    #[cfg(target_os = "windows")]
    {
        if path_str.starts_with("\\\\") || path_str.contains(":\\") {
            return Ok(dunce::canonicalize(path)?);
        }
    }

    // for relative paths, convert to absolute paths
    if path.is_relative() {
        let current_dir = std::env::current_dir()?;
        Ok(dunce::canonicalize(current_dir.join(path))?)
    } else {
        Ok(dunce::canonicalize(path)?)
    }
}

fn is_image_file(path: &Path) -> bool {
    if !path.exists() || !path.is_file() {
        return false;
    }

    if let Some(extension) = path.extension() {
        if let Some(ext_str) = extension.to_str() {
            let ext_lower = ext_str.to_lowercase();
            let image_extensions = ["jpg", "jpeg", "png", "gif", "webp", "tiff", "avif"];
            if image_extensions.contains(&ext_lower.as_str()) {
                return true;
            }
        }
    }

    if let Ok(file_data) = fs::read(path) {
        if detect_image_format(&file_data).is_some() {
            return true;
        }
    }

    false
}

async fn parse_clipboard_images(
    candidate_format: Option<String>,
    temp_dir: Option<PathBuf>,
) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let mut clipboard = Clipboard::new()?;
    let mut result: Vec<String> = Vec::new();
    let mut candidate_format = candidate_format.unwrap_or_else(|| "png".to_string());
    let temp_dir = temp_dir.unwrap_or_else(|| std::env::temp_dir());

    if let Ok(file_list) = clipboard.get().file_list() {
        info!("[parse_clipboard_images] File list: {:?}", file_list);
        for file in file_list {
            result.push(file.to_string_lossy().to_string());
        }
    } else if let Ok(image_data) = clipboard.get().image() {
        info!(
            "[parse_clipboard_images] Image data: {}x{}, {} bytes",
            image_data.width,
            image_data.height,
            image_data.bytes.len()
        );
        let temp_path = save_rgba_image_to_temp(&image_data, &candidate_format, &temp_dir)?;
        result.push(temp_path);
    }
    // else if let Ok(text) = clipboard.get().text() {
    //     info!("[parse_clipboard_images] Text: {}", text);
    //     let text = text.trim();

    //     if text.starts_with("http://") || text.starts_with("https://") {
    //         if let Ok(url) = Url::parse(text) {
    //             if is_image_url(&url) {
    //                 match download_image_from_url(&url).await {
    //                     Ok(temp_path) => result.push(temp_path),
    //                     Err(e) => error!(
    //                         "[parse_clipboard_images] Failed to download image from URL: {}",
    //                         e
    //                     ),
    //                 }
    //             }
    //         }
    //     } else {
    //         let paths = parse_file_paths(text);
    //         for path_str in paths {
    //             if let Ok(path) = canonicalize_path(&path_str) {
    //                 if is_image_file(&path) {
    //                     result.push(path.to_string_lossy().to_string());
    //                 }
    //             }
    //         }
    //     }
    // }

    Ok(result)
}

#[tauri::command]
pub async fn ipc_parse_clipboard_images<R: Runtime>(
    app: AppHandle<R>,
    candidate_format: String,
    temp_dir: String,
) -> Response {
    let data =
        match parse_clipboard_images(Some(candidate_format), Some(PathBuf::from(temp_dir))).await {
            Ok(data) => data,
            Err(error) => {
                error!("[ipc_parse_clipboard_images] Error: {}", error);
                return Response::new(
                    serde_json::json!({
                        "success": false,
                        "error": error.to_string(),
                    })
                    .to_string(),
                );
            }
        };
    Response::new(
        serde_json::json!({
            "success": true,
            "paths": data,
        })
        .to_string(),
    )
}
