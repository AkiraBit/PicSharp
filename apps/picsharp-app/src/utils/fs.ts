import { invoke } from '@tauri-apps/api/core';
import { ICompressor } from './compressor';
import { isValidArray } from '.';

const mags = ' KMGTPEZY';
export function humanSize(bytes: number, precision: number = 1) {
  const magnitude = Math.min((Math.log(bytes) / Math.log(1024)) | 0, mags.length - 1);
  const result = bytes / Math.pow(1024, magnitude);
  const suffix = mags[magnitude].trim() + 'B';
  return result.toFixed(precision) + suffix;
}

export interface ParsePathsItem {
  id: string;
  name: string;
  path: string;
  base_dir: string;
  asset_path: string;
  bytes_size: number;
  formatted_bytes_size: string;
  disk_size: number;
  formatted_disk_size: string;
  ext: string;
  mime_type: string;
}

export async function parsePaths(paths: string[], validExts: string[]) {
  const candidates = await invoke<ParsePathsItem[]>('ipc_parse_paths', {
    paths,
    validExts,
  });
  if (isValidArray(candidates)) {
    return candidates.map<FileInfo>((item) => ({
      id: item.id,
      path: item.path,
      assetPath: item.asset_path,
      name: item.name,
      parentDir: item.base_dir,
      bytesSize: item.bytes_size,
      formattedBytesSize: humanSize(item.bytes_size),
      diskSize: item.disk_size,
      formattedDiskSize: humanSize(item.disk_size),
      mimeType: item.mime_type,
      ext: item.ext,
      compressedBytesSize: 0,
      formattedCompressedBytesSize: '',
      compressedDiskSize: 0,
      formattedCompressedDiskSize: '',
      compressRate: '',
      outputPath: '',
      status: ICompressor.Status.Pending,
      originalTempPath: '',
    }));
  }
  return [];
}

export async function countValidFiles(paths: string[], validExts: string[]) {
  const count = await invoke<number>('ipc_count_valid_files', {
    paths,
    validExts,
  });
  return count;
}

/**
 * 获取文件名
 * @param path 文件路径
 * @example
 * getFilename("path/to/file.jpg") // "file"
 * @returns 文件名
 */
export function getFilename(path: string) {
  const filename = path.split('/').pop();
  if (!filename) {
    return '';
  }
  return filename.split('.')[0];
}
