import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { isFunction } from 'radash';
import EventEmitter from 'eventemitter3';

export namespace INativeCompressor {
  export enum EventType {
    CompressionProgress = 'compression-progress',
    CompressionCompleted = 'compression-completed',
  }

  export enum CompressionStatus {
    Success = 'Success',
    Failed = 'Failed',
  }

  export interface CompressionResult {
    input_path: string;
    status: CompressionStatus;
    output_path: string;
    output_path_converted: string;
    compressed_bytes_size: number;
    compressed_disk_size: number;
    cost_time: number;
    compress_rate: number;
    error_message?: string;
    original_temp_path: string;
  }

  export type CompressionProgressCallback = (result: CompressionResult) => void;
  export type CompressionCompletedCallback = (results: CompressionResult[]) => void;
}

export class NativeCompressor extends EventEmitter {
  private static instance: NativeCompressor;
  private progressUnlisten?: () => void;
  private completedUnlisten?: () => void;

  constructor() {
    super();
    this.setupEventListeners();
  }

  public static getInstance(): NativeCompressor {
    if (!NativeCompressor.instance) {
      NativeCompressor.instance = new NativeCompressor();
    }
    return NativeCompressor.instance;
  }

  private async setupEventListeners(): Promise<void> {
    this.progressUnlisten = await listen<INativeCompressor.CompressionResult>(
      'compression-progress',
      (event) => {
        this.emit('compression-progress', event.payload);
      },
    );

    this.completedUnlisten = await listen<INativeCompressor.CompressionResult[]>(
      'compression-completed',
      (event) => {
        this.emit('compression-completed', event.payload);
      },
    );
  }

  public async compress(
    filePaths: string[],
    onProgress?: INativeCompressor.CompressionProgressCallback,
    onCompleted?: INativeCompressor.CompressionCompletedCallback,
  ): Promise<void> {
    if (isFunction(onProgress)) {
      this.on(INativeCompressor.EventType.CompressionProgress, onProgress);
    }

    if (isFunction(onCompleted)) {
      this.on(INativeCompressor.EventType.CompressionCompleted, onCompleted);
    }

    try {
      await invoke('ipc_compress_images', {
        paths: filePaths,
      });
    } catch (error) {
      console.error('Failed to compress images:', error);
      throw error;
    } finally {
      if (isFunction(onProgress)) {
        this.off(INativeCompressor.EventType.CompressionProgress, onProgress);
      }

      if (isFunction(onCompleted)) {
        this.off(INativeCompressor.EventType.CompressionCompleted, onCompleted);
      }
    }
  }

  public dispose(): void {
    this.progressUnlisten?.();
    this.completedUnlisten?.();
    this.removeAllListeners();
  }
}

// 导出单例实例
export const nativeCompressor = NativeCompressor.getInstance();
