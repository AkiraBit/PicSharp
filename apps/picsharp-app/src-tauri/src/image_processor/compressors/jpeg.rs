use crate::image_processor::common::CompressionError;
use image;
use mozjpeg;
use std::fs;
use std::path::Path;

pub fn compress_jpeg(
    input_path: &Path,
    output_path: &Path,
    level: u8,
) -> Result<(), CompressionError> {
    let img =
        image::open(input_path).map_err(|e| CompressionError::ImageProcessing(e.to_string()))?;

    let rgb = img.to_rgb8();
    let width = rgb.width() as usize;
    let height = rgb.height() as usize;
    let rgb_data = rgb.as_raw();

    let mut comp = mozjpeg::Compress::new(mozjpeg::ColorSpace::JCS_RGB);

    comp.set_size(width, height);

    let quality = match level {
        6 => 10.0,
        5 => 30.0,
        4 => 60.0,
        3 => 75.0,
        2 => 85.0,
        1 => 100.0,
        _ => 75.0,
    };

    comp.set_quality(quality);

    let buffer = std::panic::catch_unwind(|| -> std::io::Result<Vec<u8>> {
        let mut comp = comp.start_compress(Vec::new())?;
        comp.write_scanlines(rgb_data)?;
        let jpeg_data = comp.finish()?;
        Ok(jpeg_data)
    })
    .map_err(|_| CompressionError::ImageProcessing("JPEG compression failed".to_string()))?
    .map_err(|e| CompressionError::ImageProcessing(e.to_string()))?;

    fs::write(output_path, buffer).map_err(|e| CompressionError::Io(e))?;

    Ok(())
}
