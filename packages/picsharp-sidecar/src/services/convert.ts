import sharp, { Sharp } from 'sharp';
import { getFileExtWithoutDot, createExtOutputPath } from '../utils';
import { ConvertFormat } from '../constants';

export async function convert(
  inputPath: string,
  type: ConvertFormat,
  alpha: string,
  stream: Sharp,
) {
  try {
    const outputPath = createExtOutputPath(inputPath, type);
    let result = null;
    switch (type) {
      case ConvertFormat.PNG:
        result = await stream.png().toFile(outputPath);
        break;
      case ConvertFormat.JPG:
        result = await stream.flatten({ background: alpha }).jpeg().toFile(outputPath);
        break;
      case ConvertFormat.WEBP:
        result = await stream.webp().toFile(outputPath);
        break;
      case ConvertFormat.AVIF:
        result = await stream.avif().toFile(outputPath);
        break;
      default:
        throw new Error(`Unsupported convert format: ${type}`);
    }
    return {
      success: true,
      output_path: outputPath,
      format: type,
      info: result,
    };
  } catch (error: any) {
    return {
      success: false,
      format: type,
      error_msg: error instanceof Error ? error.message : error.toString(),
    };
  }
}

export async function bulkConvert(
  inputPath: string,
  types: ConvertFormat[],
  alpha: string,
  stream?: Sharp,
) {
  const tasks = [];
  const ext = getFileExtWithoutDot(inputPath);
  if (!stream) {
    stream = sharp(inputPath, { limitInputPixels: false, animated: true });
  }
  for (const type of types) {
    if (ext === 'jpeg' && type === ConvertFormat.JPG) {
      continue;
    } else if (ext !== type) {
      const convertStream = stream.clone();
      tasks.push(convert(inputPath, type, alpha, convertStream));
    }
  }
  return Promise.all(tasks);
}
