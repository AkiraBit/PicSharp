import sharp, { Sharp } from 'sharp';
import { getFileExtWithoutDot, createExtOutputPath } from '../utils';
import { ConvertFormat } from '../constants';

export async function convert(
  inputPath: string,
  type: ConvertFormat,
  alpha: string,
  sharpInstance: Sharp,
) {
  try {
    const outputPath = createExtOutputPath(inputPath, type);
    let result = null;
    switch (type) {
      case ConvertFormat.PNG:
        result = await sharpInstance.toFormat('png').toFile(outputPath);
        break;
      case ConvertFormat.JPG:
        result = await sharpInstance
          .flatten({ background: alpha })
          .toFormat('jpg')
          .toFile(outputPath);
        break;
      case ConvertFormat.WEBP:
        result = await sharpInstance.toFormat('webp').toFile(outputPath);
        break;
      case ConvertFormat.AVIF:
        result = await sharpInstance.toFormat('avif').toFile(outputPath);
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
  sharpInstance?: Sharp,
) {
  const tasks = [];
  const ext = getFileExtWithoutDot(inputPath);
  if (!sharpInstance) {
    sharpInstance = sharp(inputPath);
  }
  for (const type of types) {
    if (ext === 'jpeg' && type === ConvertFormat.JPG) {
      continue;
    } else if (ext !== type) {
      tasks.push(convert(inputPath, type, alpha, sharpInstance));
    }
  }
  return Promise.all(tasks);
}
