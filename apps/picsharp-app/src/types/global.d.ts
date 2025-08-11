import type { ICompressor } from '../utils/compressor';
import type { CompressionOutputMode } from '../constants';

declare global {
  interface ConvertResult {
    success: boolean;
    output_path: string;
    format: string;
    error_msg?: string;
    info: {
      format: string;
      width: number;
      height: number;
      channels: number;
      premultiplied: boolean;
      size: number;
    };
  }

  interface FileInfo {
    id: string;
    name: string;
    path: string;
    parentDir: string;
    assetPath: string;
    bytesSize: number;
    formattedBytesSize: string;
    diskSize: number;
    formattedDiskSize: string;
    ext: string;
    mimeType: string;
    compressedBytesSize: number;
    formattedCompressedBytesSize: string;
    compressedDiskSize: number;
    formattedCompressedDiskSize: string;
    compressRate: string;
    outputPath: string;
    status: ICompressor.Status;
    originalTempPath: string;
    errorMessage?: string;
    saveType?: CompressionOutputMode;
    convertResults?: ConvertResult[];
    ssim: number;
  }
}

export {};
