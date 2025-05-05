use crate::image_processor::common::CompressionError;
use std::fs;
use std::io::{self, Error, ErrorKind};
use std::path::Path;
use std::process::Command;

pub fn compress_svg(input_path: &Path, output_path: &Path) -> Result<(), CompressionError> {
    let svg_data = fs::read_to_string(input_path).map_err(|e| CompressionError::Io(e))?;

    // TODO: implement svg compression
    fs::write(output_path, svg_data).map_err(|e| CompressionError::Io(e))?;

    Ok(())
}
