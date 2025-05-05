use arboard::Clipboard;
use filesize::PathExt;
use image::ImageReader;
use nanoid::nanoid;
use rayon::prelude::*;
use std::collections::HashSet;
use std::error::Error;
use std::ffi::OsStr;
use std::fs::{metadata, Metadata};
use std::io;
use std::path::{Path, PathBuf};
use tauri::ipc::Response;
use walkdir::{DirEntry, WalkDir};

pub fn convert_file_src(orig_path: &str) -> Result<String, io::Error> {
    let base = "asset://localhost/";
    // 规范化路径
    let path = dunce::canonicalize(orig_path)?;
    // 对路径进行 URL 编码
    let path_lossy = path.to_string_lossy().into_owned();
    let encoded = urlencoding::encode(&path_lossy);
    // 返回格式化后的字符串
    Ok(format!("{}{}", base, encoded))
}

/**
 * 获取文件占磁盘的大小
 */
pub fn get_file_disk_size(path: &str, metadata: Option<&Metadata>) -> Result<u64, io::Error> {
    let size = if let Some(md) = metadata {
        Path::new(path).size_on_disk_fast(md)?
    } else {
        Path::new(path).size_on_disk()?
    };
    Ok(size)
}

/**
 * 获取文件字节数
 */
pub fn get_file_bytes_size(path: &str, metadata: Option<&Metadata>) -> Result<u64, io::Error> {
    if let Some(md) = metadata {
        Ok(md.len())
    } else {
        Ok(Path::new(path).metadata()?.len())
    }
}

/**
 * 获取文件名
 */
pub fn get_file_name(path: &Path) -> String {
    path.file_name()
        .and_then(|n| n.to_str())
        .map(|s| s.to_string())
        .unwrap_or_default()
}

/**
 * 获取文件扩展名
 */
pub fn get_file_extension(path: &Path) -> String {
    path.extension()
        .and_then(OsStr::to_str)
        .map(|s| s.to_lowercase())
        .unwrap_or_default()
}

/**
 * 获取文件mime类型
 */
pub fn get_file_mime_type(path: &Path) -> Option<String> {
    match path.extension().and_then(OsStr::to_str).unwrap_or_default() {
        "jpg" | "jpeg" => Some("image/jpeg".to_string()),
        "png" => Some("image/png".to_string()),
        "webp" => Some("image/webp".to_string()),
        "avif" => Some("image/avif".to_string()),
        "svg" => Some("image/svg+xml".to_string()),
        _ => None,
    }
}

/**
 * 获取文件父目录
 */
pub fn get_file_parent_dir(path: &Path) -> PathBuf {
    path.parent().map(|p| p.to_path_buf()).unwrap_or_default()
}

/**
 * 文件信息
 */
#[derive(Debug, serde::Serialize)]
pub struct FileInfo {
    // 文件id
    pub id: String,
    // 文件名
    pub name: String,
    // 文件路径
    pub path: PathBuf,
    // 文件所在目录
    pub base_dir: PathBuf,
    // 文件资源路径
    pub asset_path: String,
    // 文件字节数
    pub bytes_size: u64,
    // 文件格式化大小
    pub formatted_bytes_size: String,
    // 文件磁盘大小
    pub disk_size: u64,
    // 文件格式化磁盘大小
    pub formatted_disk_size: String,
    // 文件扩展名
    pub ext: String,
    // 文件mime类型
    pub mime_type: String,
}

impl FileInfo {
    fn from_entry(entry: &DirEntry, valid_exts: Vec<String>) -> Option<Self> {
        let path = entry.path();
        let md = metadata(path).ok()?;

        // 跳过目录只处理文件
        if !md.is_file() {
            return None;
        }

        let name = get_file_name(path);
        let ext = get_file_extension(path);

        // 检查文件扩展名是否在有效扩展名列表中
        if !valid_exts.iter().any(|valid_ext| valid_ext == &ext) {
            return None;
        }

        let base_dir = get_file_parent_dir(path);
        let asset_path = convert_file_src(path.to_str().unwrap_or_default()).unwrap_or_default();

        Some(FileInfo {
            id: nanoid!(),
            name,
            path: path.to_path_buf(),
            base_dir,
            asset_path,
            bytes_size: get_file_bytes_size(path.to_str().unwrap_or_default(), Some(&md))
                .unwrap_or(0),
            formatted_bytes_size: format_file_size(
                get_file_bytes_size(path.to_str().unwrap_or_default(), Some(&md)).unwrap_or(0),
            ),
            disk_size: get_file_disk_size(path.to_str().unwrap_or_default(), Some(&md))
                .unwrap_or(0),
            formatted_disk_size: format_file_size(
                get_file_disk_size(path.to_str().unwrap_or_default(), Some(&md)).unwrap_or(0),
            ),
            ext,
            mime_type: get_file_mime_type(path).unwrap_or_default(),
        })
    }
}

/**
 * 解析路径,返回符合条件的文件信息列表
 */
pub fn parse_paths(paths: Vec<String>, valid_exts: Vec<String>) -> Vec<FileInfo> {
    paths
        .into_par_iter()
        .flat_map(|path| {
            WalkDir::new(path)
                .into_iter()
                .filter_map(|e| e.ok())
                .par_bridge()
                .filter_map(|entry: walkdir::DirEntry| {
                    FileInfo::from_entry(&entry, valid_exts.clone())
                })
                .collect::<Vec<_>>()
        })
        .collect()
}

/**
 * 检测是否为符号链接
 */
pub fn is_symlink(entry: &DirEntry) -> bool {
    entry.file_type().is_symlink()
}

/**
 * 统计有效文件
 */
pub fn count_valid_files(paths: Vec<String>, valid_exts: Vec<String>) -> usize {
    // 预处理扩展名（小写化）
    let ext_set: HashSet<String> = valid_exts.iter().map(|ext| ext.to_lowercase()).collect();

    paths
        .into_par_iter()
        .flat_map_iter(|path| {
            WalkDir::new(path)
                .follow_links(false) // 禁止跟随符号链接
                .into_iter()
                .filter_entry(|e| !is_symlink(e)) // 过滤符号链接条目
        })
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            // 筛选普通文件且扩展名匹配
            entry.file_type().is_file()
                && entry
                    .path()
                    .extension()
                    .and_then(|ext| ext.to_str())
                    .map(|ext| ext_set.contains(&ext.to_lowercase()))
                    .unwrap_or(false)
        })
        .count()
}

/**
 * 格式化文件大小
 */
pub fn format_file_size(bytes: u64) -> String {
    if bytes == 0 {
        return "0B".to_string();
    }

    let units = ["B", "KB", "MB", "GB", "TB"];
    let k: f64 = 1024.0;
    let i = (bytes as f64).log(k).floor() as usize;

    let size = bytes as f64 / k.powi(i as i32);
    if (size.fract() * 100.0).abs() < f64::EPSILON {
        format!("{}{}", size.floor(), units[i])
    } else {
        format!("{:.2}{}", size, units[i])
    }
}

/**
 * 判断文件是否在指定目录下
 */
pub fn is_file_in_directory(file_path: &str, dir_path: &str) -> Result<bool, io::Error> {
    // 首先检查文件是否存在
    let file_path_obj = Path::new(file_path);
    if !file_path_obj.exists() {
        return Ok(false);
    }

    // 检查目录是否存在
    let dir_path_obj = Path::new(dir_path);
    if !dir_path_obj.exists() || !dir_path_obj.is_dir() {
        return Ok(false);
    }

    // 将两个路径都规范化为绝对路径
    let canonical_file = dunce::canonicalize(file_path)?;
    let canonical_dir = dunce::canonicalize(dir_path)?;

    // 将路径转换为字符串进行比较
    let file_str = canonical_file.to_string_lossy();
    let dir_str = canonical_dir.to_string_lossy();

    // 检查文件路径是否以目录路径开头
    Ok(file_str.starts_with(dir_str.as_ref()))
}

#[tauri::command]
pub async fn ipc_parse_paths(paths: Vec<String>, valid_exts: Vec<String>) -> Response {
    let data: Vec<FileInfo> = parse_paths(paths, valid_exts);
    Response::new(serde_json::to_string(&data).unwrap_or_default())
}

#[tauri::command]
pub async fn ipc_count_valid_files(paths: Vec<String>, valid_exts: Vec<String>) -> Response {
    let count = count_valid_files(paths, valid_exts);
    Response::new(count.to_string())
}

#[tauri::command]
pub async fn ipc_is_file_in_directory(file_path: String, dir_path: String) -> Response {
    match is_file_in_directory(&file_path, &dir_path) {
        Ok(result) => Response::new(result.to_string()),
        Err(err) => Response::new(format!("错误: {}", err)),
    }
}

fn copy_image(path: String) -> Result<(), Box<dyn Error>> {
    // 读取图片文件
    let img = ImageReader::open(path)?.decode()?.to_rgba8();

    let width = img.width() as usize;
    let height = img.height() as usize;

    // 获取图片数据
    let image_data = img.into_raw();

    // 创建剪切板实例
    let mut clipboard = Clipboard::new()?;

    // 将图片设置到剪切板
    clipboard
        .set_image(arboard::ImageData {
            width,
            height,
            bytes: image_data.into(),
        })
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn ipc_copy_image(path: String) -> Response {
    match copy_image(path) {
        Ok(_) => Response::new("{\"status\": \"success\"}".to_string()),
        Err(e) => Response::new(format!("{{\"status\": \"error\", \"message\": \"{}\"}}", e)),
    }
}
