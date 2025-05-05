use crate::image_processor::common::CompressionError;
use crate::image_processor::common::QualityMode;
use image;
use image::ImageReader;
use imagequant::{self, Attributes, RGBA};
use oxipng::{optimize_from_memory, Options as OxiOptions};
use png::{BitDepth, ColorType, Encoder, FilterType};
use std::fs;
use std::io::BufWriter;
use std::path::Path;

/// 检测PNG文件是否为APNG格式
pub fn is_apng(input_path: &Path) -> bool {
    // 方法1：通过检查文件块
    if let Ok(file_data) = fs::read(input_path) {
        // 检查文件头部是否为PNG
        if file_data.len() < 8 || &file_data[0..8] != b"\x89PNG\r\n\x1a\n" {
            return false;
        }

        // 查找acTL块，该块是APNG动画控制信息的标识
        let mut i = 8;
        while i + 12 < file_data.len() {
            let chunk_length = u32::from_be_bytes([
                file_data[i],
                file_data[i + 1],
                file_data[i + 2],
                file_data[i + 3],
            ]) as usize;

            let chunk_type = &file_data[i + 4..i + 8];

            // 如果找到acTL块，则确认是APNG
            if chunk_type == b"acTL" {
                return true;
            }

            i += 12 + chunk_length;
        }
    }

    false
}

/// 使用oxipng进行无损压缩
pub fn lossless_compress_png(
    input_path: &Path,
    output_path: &Path,
) -> Result<(), CompressionError> {
    // 读取PNG文件
    let file_data = fs::read(input_path).map_err(|e| CompressionError::Io(e))?;

    // 创建oxipng选项
    let mut options = OxiOptions::from_preset(2);
    options.fast_evaluation = true; // 开启快速模式
    options.deflate = oxipng::Deflaters::Libdeflater { compression: 6 };

    // 执行优化
    let optimized_data = optimize_from_memory(&file_data, &options)
        .map_err(|e| CompressionError::ImageProcessing(format!("Oxipng error: {}", e)))?;

    // 写入输出文件
    fs::write(output_path, optimized_data).map_err(|e| CompressionError::Io(e))?;

    Ok(())
}

/// 使用imagequant进行有损压缩
pub fn lossy_compress_png(
    input_path: &Path,
    output_path: &Path,
    level: u8,
) -> Result<(), CompressionError> {
    // 读取图像
    let img = ImageReader::open(input_path)
        .map_err(|e| CompressionError::Io(e))?
        .decode()
        .map_err(|e| CompressionError::ImageProcessing(format!("Image decode error: {}", e)))?
        .to_rgba8();

    let width = img.width() as usize;
    let height = img.height() as usize;

    // 将图像数据转换为imagequant需要的RGBA格式
    let mut rgba_pixels: Vec<RGBA> = Vec::with_capacity(width * height);
    for pixel in img.pixels() {
        rgba_pixels.push(RGBA {
            r: pixel[0],
            g: pixel[1],
            b: pixel[2],
            a: pixel[3],
        });
    }

    log::info!("level: {:?}", level);

    // 根据压缩等级设置质量参数
    let (min_quality, max_quality, dithering, speed) = match level {
        1 => (90, 99, 1.0, 1),
        2 => (80, 90, 1.0, 2),
        3 => (70, 90, 1.0, 3),
        4 => (40, 70, 1.0, 4),
        5 => (20, 50, 1.0, 7),
        6 => (0, 20, 1.0, 10),
        _ => (70, 90, 1.0, 3),
    };

    // 创建属性对象并设置参数
    let mut attributes = Attributes::new();

    // attributes.set_max_colors(256).map_err(|e| {
    //     CompressionError::ImageProcessing(format!("Imagequant max colors error: {}", e))
    // })?;

    // 设置质量范围（最小值和最大值）
    // imagequant最低质量值不能太低，否则会出现QUALITY_TOO_LOW错误
    attributes
        .set_quality(min_quality, max_quality)
        .map_err(|e| {
            CompressionError::ImageProcessing(format!("Imagequant quality error: {}", e))
        })?;

    attributes
        .set_speed(speed)
        .map_err(|e| CompressionError::ImageProcessing(format!("Imagequant speed error: {}", e)))?;
    // 创建图像对象
    let mut img_result = attributes
        .new_image(rgba_pixels.as_slice(), width, height, 0.0)
        .map_err(|e| {
            CompressionError::ImageProcessing(format!("Imagequant image creation error: {}", e))
        })?;

    // 量化图像
    let mut quantization = match attributes.quantize(&mut img_result) {
        Ok(q) => q,
        Err(imagequant::Error::QualityTooLow) => {
            // 如果出现QualityTooLow错误，重新设置质量为0-100并重试
            attributes.set_quality(30, 100).map_err(|e| {
                CompressionError::ImageProcessing(format!("Imagequant quality error: {}", e))
            })?;

            // 重新创建图像对象
            let mut new_img_result = attributes
                .new_image(rgba_pixels.as_slice(), width, height, 2.2)
                .map_err(|e| {
                    CompressionError::ImageProcessing(format!(
                        "Imagequant image creation error: {}",
                        e
                    ))
                })?;

            // 使用新的图像对象进行量化
            attributes.quantize(&mut new_img_result).map_err(|e| {
                CompressionError::ImageProcessing(format!("Imagequant quantization error: {}", e))
            })?
        }
        Err(e) => {
            return Err(CompressionError::ImageProcessing(format!(
                "Imagequant quantization error: {}",
                e
            )))
        }
    };

    // 设置抖动级别 (0-1.0)
    quantization.set_dithering_level(dithering).map_err(|e| {
        CompressionError::ImageProcessing(format!("Imagequant dithering error: {}", e))
    })?;

    // 获取量化后的结果
    let (palette, pixels) = quantization.remapped(&mut img_result).map_err(|e| {
        CompressionError::ImageProcessing(format!("Imagequant remapping error: {}", e))
    })?;

    // 构建输出图像
    let mut output_pixels = vec![0u8; width * height * 4];
    for (i, &pixel) in pixels.iter().enumerate() {
        let color = palette[pixel as usize];
        output_pixels[i * 4 + 0] = color.r;
        output_pixels[i * 4 + 1] = color.g;
        output_pixels[i * 4 + 2] = color.b;
        output_pixels[i * 4 + 3] = color.a;
    }

    // 使用png库进行编码和保存
    let file = std::fs::File::create(output_path).map_err(|e| CompressionError::Io(e))?;
    let buf_writer = BufWriter::new(file);

    // 设置编码器，根据压缩等级选择合适的筛选器
    let filter_type = match level {
        0..=3 => FilterType::NoFilter, // 低压缩率，快速处理
        4..=6 => FilterType::Sub,      // 中等压缩率
        _ => FilterType::Paeth,        // 高压缩率，较好的压缩效果
    };

    let mut encoder = Encoder::new(buf_writer, width as u32, height as u32);
    encoder.set_color(ColorType::Rgba);
    encoder.set_depth(BitDepth::Eight);
    encoder.set_filter(FilterType::Paeth);
    encoder.set_compression(png::Compression::Best); // 使用最高压缩级别

    // 写入图像数据
    let mut writer = encoder
        .write_header()
        .map_err(|e| CompressionError::ImageProcessing(format!("PNG header error: {}", e)))?;

    writer
        .write_image_data(&output_pixels)
        .map_err(|e| CompressionError::ImageProcessing(format!("PNG data write error: {}", e)))?;

    Ok(())
}

pub fn compress_png(
    input_path: &Path,
    output_path: &Path,
    level: u8,
    mode: Option<QualityMode>,
) -> Result<(), CompressionError> {
    // 检测是否为APNG格式
    if is_apng(input_path) {
        return Err(CompressionError::UnsupportedFormat("APNG".to_string()));
    }

    log::info!("compress_png:  {:?} {:?}", level, mode);

    // 根据压缩模式选择有损或无损压缩
    match mode {
        Some(QualityMode::Lossless) => lossless_compress_png(input_path, output_path),
        Some(QualityMode::Lossy) => lossy_compress_png(input_path, output_path, level),
        None => lossy_compress_png(input_path, output_path, level),
    }
}
