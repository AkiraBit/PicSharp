import { Sharp } from 'sharp';
import { ConvertFormat } from '../constants';
import path from 'node:path';
import Sentry from '@sentry/node';

export async function convert(
  stream: Sharp,
  outputPath: string,
  format: ConvertFormat,
  alpha: string,
) {
  try {
    let result = null;
    switch (format) {
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
        throw new Error(`Unsupported convert format: ${format}`);
    }
    return {
      success: true,
      output_path: outputPath,
      format,
      info: result,
    };
  } catch (error: any) {
    Sentry.captureException(error);
    return {
      success: false,
      format,
      error_msg: error instanceof Error ? error.message : error.toString(),
    };
  }
}

export async function bulkConvert(
  stream: Sharp,
  originalExt: string,
  outputName: string,
  outputDir: string,
  types: ConvertFormat[],
  alpha: string,
) {
  const tasks = [];
  originalExt = originalExt.startsWith('.') ? originalExt.slice(1) : originalExt;
  for (const type of types) {
    if (type === originalExt || (type === ConvertFormat.JPG && originalExt === 'jpeg')) {
      continue;
    }
    const outputPath = path.join(outputDir, `${outputName}.${type}`);
    tasks.push(convert(stream.clone(), outputPath, type, alpha));
  }
  return Promise.all(tasks);
}
