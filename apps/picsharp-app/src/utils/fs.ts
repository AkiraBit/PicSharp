import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { ICompressor } from './compressor';
import { isValidArray } from '.';
import { CompressionOutputMode } from '@/constants';
import { copyFile, exists, remove } from '@tauri-apps/plugin-fs';

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
      assetPath: convertFileSrc(item.path),
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

export function getFilename(path: string): string {
  if (typeof path !== 'string' || !path.trim()) {
    return '';
  }

  const cleanPath = path.trim().replace(/[/\\]+$/, '');

  if (!cleanPath) {
    return '';
  }

  const pathParts = cleanPath.split(/[/\\]+/).filter((part) => part.length > 0);

  if (pathParts.length === 0) {
    return '';
  }

  const filename = pathParts[pathParts.length - 1];

  if (filename.startsWith('.') && filename.indexOf('.', 1) === -1) {
    return filename;
  }

  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex === -1 || dotIndex === 0) {
    return filename;
  }

  return filename;
}

export async function undoSave(file: FileInfo) {
  if (
    file.status === ICompressor.Status.Completed &&
    file.outputPath &&
    file.originalTempPath &&
    file.saveType
  ) {
    const { path, outputPath, originalTempPath, saveType } = file;
    if (!(await exists(originalTempPath))) {
      return {
        success: false,
        message: 'undo.original_file_not_exists',
      };
    }
    if (saveType === CompressionOutputMode.Overwrite) {
      copyFile(originalTempPath, path);
    } else {
      if (!(await exists(outputPath))) {
        return {
          success: false,
          message: 'undo.output_file_not_exists',
        };
      }
      if (file.path === file.outputPath) {
        copyFile(originalTempPath, path);
      } else {
        remove(outputPath);
      }
    }
    return {
      success: true,
      message: 'undo.success',
    };
  }
  return {
    success: false,
    message: 'undo.no_allow_undo',
  };
}
