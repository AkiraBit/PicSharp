import type { ICompressor } from '../utils/compressor';
import type { CompressionOutputMode } from '../constants';

declare global {
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
  }
}

export {};
