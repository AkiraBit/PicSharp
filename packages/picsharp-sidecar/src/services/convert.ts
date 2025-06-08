import path from 'node:path';
import sharp from 'sharp';
import { getFileExtWithoutDot, createExtOutputPath } from '../utils';

export enum ConvertFormat {
  PNG = 'png',
  JPG = 'jpg',
  JPEG = 'jpeg',
  WEBP = 'webp',
  AVIF = 'avif',
}

export async function convert(inputPath: string, type: ConvertFormat, alpha: string) {
  try {
    const outputPath = createExtOutputPath(inputPath, type);
    let result = null;
    switch (type) {
      case ConvertFormat.PNG:
        result = await sharp(inputPath).toFormat('png').toFile(outputPath);
        break;
      case ConvertFormat.JPG:
        result = await sharp(inputPath)
          .flatten({ background: alpha })
          .toFormat('jpg')
          .toFile(outputPath);
        break;
      case ConvertFormat.JPEG:
        result = await sharp(inputPath)
          .flatten({ background: alpha })
          .toFormat('jpeg')
          .toFile(outputPath);
        break;
      case ConvertFormat.WEBP:
        result = await sharp(inputPath).toFormat('webp').toFile(outputPath);
        break;
      case ConvertFormat.AVIF:
        result = await sharp(inputPath).toFormat('avif').toFile(outputPath);
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

export async function bulkConvert(inputPath: string, types: ConvertFormat[], alpha: string) {
  const tasks = [];
  const ext = getFileExtWithoutDot(inputPath);
  for (const type of types) {
    if (ext !== type) {
      tasks.push(convert(inputPath, type, alpha));
    }
  }
  return Promise.all(tasks);
}
