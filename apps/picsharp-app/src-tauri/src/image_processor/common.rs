use image::{imageops, DynamicImage, GenericImageView};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum CompressionError {
    #[error("IO error: {0}")]
    Io(#[from] io::Error),

    #[error("Image processing error: {0}")]
    ImageProcessing(String),

    #[error("Unsupported format: {0}")]
    UnsupportedFormat(String),

    #[error("File not found: {0}")]
    FileNotFound(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CompressionStatus {
    Success = 0,
    Failed = 1,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum QualityMode {
    #[serde(rename = "lossless")]
    Lossless,
    #[serde(rename = "lossy")]
    Lossy,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressionResult {
    pub input_path: String,
    pub status: CompressionStatus,
    pub output_path: String,
    pub output_path_converted: String,
    pub compressed_bytes_size: u64,
    pub compressed_disk_size: u64,
    pub cost_time: u64,
    pub compress_rate: f64,
    pub error_message: Option<String>,
    pub original_temp_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CompressionOutputMode {
    #[serde(rename = "overwrite")]
    Overwrite,
    #[serde(rename = "save_as_new_file")]
    SaveAsNewFile,
    #[serde(rename = "save_to_new_folder")]
    SaveToNewFolder,
}

impl std::str::FromStr for CompressionOutputMode {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "overwrite" => Ok(Self::Overwrite),
            "save_as_new_file" => Ok(Self::SaveAsNewFile),
            "save_to_new_folder" => Ok(Self::SaveToNewFolder),
            _ => Ok(Self::Overwrite),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressionOptions {
    // 输出模式
    pub output_mode: CompressionOutputMode,
    // 输出模式为save_as_file_suffix时，文件名后缀
    pub output_mode_save_as_file_suffix: String,
    // 输出模式为save_to_folder时，输出文件夹路径
    pub output_mode_save_to_folder: String,
    // 是否限制压缩率阈值
    pub save_compress_rate_limit: bool,
    // 压缩率阈值
    pub save_compress_rate_limit_threshold: f64,
    // 保留元数据
    pub retain_metadata: Vec<String>,
    // 压缩等级
    pub quality_level: u8,
    // 压缩模式
    pub quality_mode: QualityMode,
}

impl Default for CompressionOptions {
    fn default() -> Self {
        Self {
            output_mode: CompressionOutputMode::Overwrite,
            output_mode_save_as_file_suffix: "_compressed".to_string(),
            output_mode_save_to_folder: "".to_string(),
            save_compress_rate_limit: false,
            save_compress_rate_limit_threshold: 0.2,
            retain_metadata: vec![
                "copyright".to_string(),
                "creator".to_string(),
                "location".to_string(),
            ],
            quality_level: 4,
            quality_mode: QualityMode::Lossy,
        }
    }
}

// 计算压缩率
pub fn calculate_compress_rate(original_size: u64, compressed_size: u64) -> f64 {
    let rate = ((original_size as f64 - compressed_size as f64) / original_size as f64) * 100.0;
    (rate * 100.0).round() / 100.0
}

// 获取输出路径
pub fn get_output_path(input_path: &Path, options: &CompressionOptions) -> PathBuf {
    match options.output_mode {
        CompressionOutputMode::SaveToNewFolder
            if !options.output_mode_save_to_folder.is_empty() =>
        {
            let file_name = input_path.file_name().unwrap_or_default();
            Path::new(&options.output_mode_save_to_folder).join(file_name)
        }
        CompressionOutputMode::SaveAsNewFile => {
            let parent = input_path.parent().unwrap_or_else(|| Path::new(""));
            let file_stem = input_path.file_stem().unwrap_or_default();
            let ext = input_path.extension().unwrap_or_default();

            parent.join(format!(
                "{}{}{}",
                file_stem.to_string_lossy(),
                options.output_mode_save_as_file_suffix,
                if ext.is_empty() {
                    "".to_string()
                } else {
                    format!(".{}", ext.to_string_lossy())
                }
            ))
        }
        _ => input_path.to_path_buf(),
    }
}

const RIFF_HEADER: &[u8] = b"RIFF";
const WEBP_HEADER: &[u8] = b"WEBP";
const ANIM_CHUNK: &[u8] = b"ANIM";
const ANMF_CHUNK: &[u8] = b"ANMF";

pub fn is_webp_animation(input_path: &Path) -> Result<bool, io::Error> {
    let buffer = match fs::read(input_path) {
        Ok(data) => data,
        Err(e) => {
            return Err(e);
        }
    };
    // 检查文件大小是否足够包含WebP头部
    if buffer.len() < 12 {
        return Ok(false);
    }

    // 检查RIFF头部
    if &buffer[0..4] != RIFF_HEADER || &buffer[8..12] != WEBP_HEADER {
        return Ok(false);
    }

    // 搜索ANIM或ANMF块（动画WebP的特征）
    let mut pos = 12;
    while pos + 8 < buffer.len() {
        let chunk_size = u32::from_le_bytes([
            buffer[pos + 4],
            buffer[pos + 5],
            buffer[pos + 6],
            buffer[pos + 7],
        ]) as usize;
        if &buffer[pos..pos + 4] == ANIM_CHUNK || &buffer[pos..pos + 4] == ANMF_CHUNK {
            return Ok(true);
        }

        pos += 8 + ((chunk_size + 1) & !1); // 跳到下一个块（考虑对齐）
        if pos >= buffer.len() {
            break;
        }
    }

    Ok(false)
}

/// 预处理图像以获得更好的压缩效果
pub fn preprocess_image(img: &DynamicImage, quality: u8) -> DynamicImage {
    let mut processed = img.clone();

    // 对于高压缩率需求，可以应用一些预处理
    if quality < 40 {
        // 轻微降低分辨率，如果图像足够大
        if processed.width() > 1600 || processed.height() > 1600 {
            let scale_factor = 0.75;
            let new_width = (processed.width() as f32 * scale_factor) as u32;
            let new_height = (processed.height() as f32 * scale_factor) as u32;
            processed = processed.resize(new_width, new_height, imageops::FilterType::Lanczos3);
        }

        // 对于非常低的质量设置，应用轻微模糊以去除噪点和细节，提高压缩效率
        if quality < 20 {
            processed = processed.blur(1.0);
        }
    }

    processed
}

/// 检测图像是否包含透明度
pub fn has_transparency(img: &DynamicImage) -> bool {
    if !img.color().has_alpha() {
        return false;
    }

    // 采样检查是否有实际透明像素
    let rgba = img.to_rgba8();
    let width = img.width();
    let height = img.height();

    // 采样检查，不需要检查所有像素
    let sample_rate = 10; // 每10个像素检查一次
    for y in (0..height).step_by(sample_rate) {
        for x in (0..width).step_by(sample_rate) {
            let pixel = rgba.get_pixel(x, y);
            if pixel[3] < 255 {
                return true;
            }
        }
    }

    false
}

/// 尝试检测图像是否可能是截图
pub fn is_likely_screenshot(img: &DynamicImage) -> bool {
    // 截图通常具有规则的边缘和大片的纯色区域

    // 检查图像尺寸是否接近标准屏幕分辨率
    let width = img.width();
    let height = img.height();

    // 常见屏幕分辨率
    let common_resolutions = [
        (1920, 1080),
        (2560, 1440),
        (3840, 2160), // 16:9 常见分辨率
        (1366, 768),
        (1280, 720),
        (1440, 900),
        (1680, 1050),
        (2560, 1600), // 16:10 分辨率
    ];

    for &(w, h) in &common_resolutions {
        // 允许小误差
        if (width as i32 - w as i32).abs() < 10 && (height as i32 - h as i32).abs() < 10 {
            return true;
        }
    }

    // 简单的边缘检测，截图通常有较多长直边缘
    let edges = detect_straight_edges(img);
    edges > 20 // 阈值可调整
}

/// 简单的直边检测
pub fn detect_straight_edges(img: &DynamicImage) -> u32 {
    // 简化版边缘检测，只检测水平和垂直边缘
    // 返回估计的直边数量
    let gray = img.grayscale();
    let width = gray.width();
    let height = gray.height();

    // 这里只是一个简化的算法
    let mut edge_count = 0;

    // 采样而不是处理所有像素
    let sample_rate = 20;
    for y in (1..height - 1).step_by(sample_rate) {
        for x in (1..width - 1).step_by(sample_rate) {
            let current = gray.get_pixel(x, y)[0] as i32;
            let right = gray.get_pixel(x + 1, y)[0] as i32;
            let bottom = gray.get_pixel(x, y + 1)[0] as i32;

            // 检测水平或垂直边缘
            if (current - right).abs() > 30 || (current - bottom).abs() > 30 {
                edge_count += 1;
            }
        }
    }

    edge_count
}

/// 检测图像是否可能含有文本
pub fn might_contain_text(img: &DynamicImage) -> bool {
    // 文本通常具有高对比度的边缘和规则的模式
    let gray = img.grayscale();
    let width = gray.width();
    let height = gray.height();

    let mut edge_pixels = 0;
    let mut total_pixels = 0;

    // 采样检查
    let sample_rate = 4;
    for y in (1..height - 1).step_by(sample_rate) {
        for x in (1..width - 1).step_by(sample_rate) {
            total_pixels += 1;

            let current = gray.get_pixel(x, y)[0] as i32;
            let right = gray.get_pixel(x + 1, y)[0] as i32;
            let bottom = gray.get_pixel(x, y + 1)[0] as i32;

            // 文本边缘通常有较高对比度
            if (current - right).abs() > 50 || (current - bottom).abs() > 50 {
                edge_pixels += 1;
            }
        }
    }

    // 计算边缘比例
    let edge_ratio = edge_pixels as f32 / total_pixels as f32;

    // 文本图像通常有较高比例的边缘，但不会过高（区别于噪点图像）
    edge_ratio > 0.1 && edge_ratio < 0.3
}
