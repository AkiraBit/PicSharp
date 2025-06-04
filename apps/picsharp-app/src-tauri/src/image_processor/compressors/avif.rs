use crate::image_processor::common::CompressionError;
use crate::image_processor::common::QualityMode;
use image;
use ravif::{AlphaColorMode, Encoder, Img};
use rgb::RGBA;
use std::fs;
use std::path::Path;

pub fn lossless_compress_avif(
    input_path: &Path,
    output_path: &Path,
) -> Result<(), CompressionError> {
    let img = image::open(input_path)
        .map_err(|e| CompressionError::ImageProcessing(e.to_string()))?
        .to_rgba8();

    let width = img.width() as usize;
    let height = img.height() as usize;

    let rgba_pixels: Vec<RGBA<u8>> = img
        .into_raw()
        .chunks_exact(4)
        .map(|p| RGBA::new(p[0], p[1], p[2], p[3]))
        .collect();

    let res = Encoder::new()
        .with_quality(100.0)
        .with_alpha_color_mode(AlphaColorMode::UnassociatedClean)
        .with_alpha_quality(100.0)
        .with_speed(4)
        .encode_rgba(Img::new(&rgba_pixels, width, height))
        .map_err(|e| CompressionError::ImageProcessing(e.to_string()))?;

    fs::write(output_path, res.avif_file).map_err(|e| CompressionError::Io(e))?;

    Ok(())
}

pub fn lossy_compress_avif(
    input_path: &Path,
    output_path: &Path,
    level: u8,
) -> Result<(), CompressionError> {
    let img = image::open(input_path)
        .map_err(|e| CompressionError::ImageProcessing(e.to_string()))?
        .to_rgba8();

    log::info!("lossy_compress_avif: {:?} {:?}", input_path, output_path);

    let width = img.width() as usize;
    let height = img.height() as usize;

    let rgba = img.as_raw().to_vec();
    let rgba_pixels: Vec<RGBA<u8>> = rgba
        .chunks_exact(4)
        .map(|p| RGBA::new(p[0], p[1], p[2], p[3]))
        .collect();

    let (quality, alpha_quality, speed) = match level {
        1 => (95.0, 95.0, 1),
        2 => (85.0, 90.0, 2),
        3 => (75.0, 85.0, 3),
        4 => (65.0, 80.0, 5),
        5 => (55.0, 75.0, 7),
        6 => (45.0, 70.0, 10),
        _ => (75.0, 85.0, 3),
    };

    log::info!("AVIF压缩等级: {:?}, 质量: {:?}", level, quality);

    let res = Encoder::new()
        .with_quality(quality)
        .with_alpha_quality(alpha_quality)
        .with_speed(speed)
        .encode_rgba(Img::new(&rgba_pixels, width, height))
        .map_err(|e| CompressionError::ImageProcessing(format!("AVIF encoding error: {}", e)))?;

    fs::write(output_path, res.avif_file).map_err(|e| CompressionError::Io(e))?;

    Ok(())
}

pub fn compress_avif(
    input_path: &Path,
    output_path: &Path,
    level: u8,
    mode: Option<QualityMode>,
) -> Result<(), CompressionError> {
    log::info!("compress_avif: {:?} {:?}", level, mode);

    match mode {
        Some(QualityMode::Lossless) => lossless_compress_avif(input_path, output_path),
        Some(QualityMode::Lossy) => lossy_compress_avif(input_path, output_path, level),
        None => lossy_compress_avif(input_path, output_path, level),
    }
}
