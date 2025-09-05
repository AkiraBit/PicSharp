import fse from 'fs-extra';
import path from 'node:path';
import fs from 'node:fs/promises';
import { nanoid } from 'nanoid';
import getPort from './get-port';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import ssim from 'ssim.js';
import sharp from 'sharp';

export const calCompressionRate = (originalSize: number, compressedSize: number) => {
  return Number(((originalSize - compressedSize) / originalSize).toFixed(2));
};

export const isFile = async (path: string) => {
  return (await fs.stat(path)).isFile();
};

export function isValidArray(arr: unknown) {
  return Array.isArray(arr) && arr.length > 0;
}

export const isDirectory = async (path: string) => {
  return (await fs.stat(path)).isDirectory();
};

export const isExists = async (path: string) => {
  return await fse.pathExists(path);
};

export const checkFile = async (path: string) => {
  if (!(await isExists(path))) {
    throw new Error(`Path '${path}' does not exist`);
  } else if (!(await isFile(path))) {
    throw new Error(`File '${path}' is not a file`);
  }
};

export const getFileSize = async (path: string) => {
  const stats = await fs.stat(path);
  return stats.size;
};

export const convertFileSrc = (path: string) => {
  if (!path) return '';
  const base = 'asset://localhost/';
  const encoded = encodeURIComponent(path);
  return `${base}${encoded}`;
};

export const copyFileToTemp = async (targetPath: string, tempDir: string) => {
  const tempFilePath = path.join(
    tempDir,
    `${path.basename(targetPath, path.extname(targetPath))}_${nanoid()}${path.extname(targetPath)}`,
  );
  await fs.copyFile(targetPath, tempFilePath);
  return tempFilePath;
};

export const createOutputPath = async (
  inputPath: string,
  options: {
    mode: 'overwrite' | 'save_as_new_file' | 'save_to_new_folder';
    new_file_suffix?: string;
    new_folder_path?: string;
  },
) => {
  switch (options.mode) {
    case 'overwrite':
      return inputPath;
    case 'save_as_new_file': {
      const fileExt = path.extname(inputPath);
      const filename = path.basename(inputPath, fileExt);
      return path.join(path.dirname(inputPath), `${filename}${options.new_file_suffix}${fileExt}`);
    }
    case 'save_to_new_folder': {
      if (!(await isDirectory(options.new_folder_path || ''))) {
        throw new Error(`Directory '${options.new_folder_path}' does not exist`);
      }
      const filename = path.basename(inputPath);
      return path.join(options.new_folder_path!, filename);
    }
  }
};

export async function findAvailablePort(preferredPort?: number): Promise<number> {
  return getPort({ port: preferredPort });
}

export interface RetryOptions {
  enable?: boolean;
  retryCount?: number;
  retryInterval?: number;
}

/**
 * 带简易指数退避算法的重试Promise
 * @param promiseFunc
 * @param retryOptions
 */
export function retryPromise<T>(
  promiseFunc: () => Promise<T>,
  retryOptions?: RetryOptions,
): Promise<T> {
  if (typeof promiseFunc !== 'function') {
    throw new TypeError('[retryPromise]: Argument 1 must be a function that returns a promise!');
  }
  return new Promise<T>((resolve, reject) => {
    const { enable = true, retryInterval, retryCount } = retryOptions || {};
    let attempt = 0;
    const retry = () => {
      Promise.resolve(promiseFunc())
        .then(resolve)
        .catch((error) => {
          if (enable) {
            if (typeof retryCount === 'number' && typeof retryInterval === 'number') {
              if (++attempt < retryCount) {
                setTimeout(() => retry(), retryInterval);
              } else {
                reject(error);
              }
            } else {
              if (++attempt < (retryCount || 3)) {
                const interval = Math.min(1000 * 2 ** ++attempt, 30 * 1000);
                setTimeout(() => retry(), interval);
              } else {
                reject(error);
              }
            }
          } else {
            reject(error);
          }
        });
    };
    retry();
  });
}

export const isWindows = process.platform === 'win32';
export const isMac = process.platform === 'darwin';
export const isLinux = process.platform === 'linux';

export const getFileExtWithoutDot = (inputPath: string) => path.extname(inputPath).slice(1);

export function createExtOutputPath(inputPath: string, ext: string) {
  return path.join(
    path.dirname(inputPath),
    `${path.basename(inputPath, path.extname(inputPath))}.${ext}`,
  );
}

export function isBigInt(value: unknown): value is BigInt {
  return typeof value === 'bigint';
}

export function jsonBigInt(key: string, value: unknown): unknown {
  if (isBigInt(value)) {
    return value.toString();
  }
  return value;
}

export function hashFile(filePath: string, algorithm = 'md5', highWaterMark = 1024 * 1024) {
  return new Promise<string>((resolve, reject) => {
    const hash = createHash(algorithm);
    const stream = createReadStream(filePath, { highWaterMark });
    stream.on('error', reject);
    hash.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

export async function getImageRawData(path: string) {
  const instance = sharp(path, { limitInputPixels: false });
  const buffer = await instance.ensureAlpha().raw().toBuffer();
  const metadata = await instance.metadata();
  return {
    data: new Uint8ClampedArray(buffer),
    width: metadata.width,
    height: metadata.height,
  };
}

export async function calculateSSIM(original: string, compressed: string) {
  const originalData = await getImageRawData(original);
  const compressedData = await getImageRawData(compressed);
  const { mssim } = ssim(
    {
      width: originalData.width,
      height: originalData.height,
      data: originalData.data,
    },
    {
      width: compressedData.width,
      height: compressedData.height,
      data: compressedData.data,
    },
  );
  return mssim;
}

export const isBuilt = __dirname.includes('dist');
export const isDev = process.env.NODE_ENV !== 'production' && !isBuilt;
