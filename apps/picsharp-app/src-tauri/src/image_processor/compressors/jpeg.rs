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
    // 读取原始图像
    let img =
        image::open(input_path).map_err(|e| CompressionError::ImageProcessing(e.to_string()))?;

    // 转换为 RGB8
    let rgb = img.to_rgb8();
    let width = rgb.width() as usize;
    let height = rgb.height() as usize;
    let rgb_data = rgb.as_raw();

    // 创建 mozjpeg 编码器对象
    let mut comp = mozjpeg::Compress::new(mozjpeg::ColorSpace::JCS_RGB);

    // 设置图像参数
    comp.set_size(width, height);

    // 根据level参数（0-5）映射到mozjpeg质量值（0-100）
    let quality = match level {
        6 => 10.0, // 最低质量
        5 => 30.0,
        4 => 60.0,
        3 => 75.0,
        2 => 85.0,
        1 => 100.0, // 最高质量
        _ => 75.0,  // 默认质量
    };

    comp.set_quality(quality);

    // 开始压缩
    let buffer = std::panic::catch_unwind(|| -> std::io::Result<Vec<u8>> {
        let mut comp = comp.start_compress(Vec::new())?;
        comp.write_scanlines(rgb_data)?;
        let jpeg_data = comp.finish()?;
        Ok(jpeg_data)
    })
    .map_err(|_| CompressionError::ImageProcessing("JPEG compression failed".to_string()))?
    .map_err(|e| CompressionError::ImageProcessing(e.to_string()))?;

    // 将压缩后的数据写入文件
    fs::write(output_path, buffer).map_err(|e| CompressionError::Io(e))?;

    Ok(())
}
