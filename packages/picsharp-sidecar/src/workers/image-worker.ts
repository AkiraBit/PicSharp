import { parentPort } from 'node:worker_threads';
import { CompressTaskPayload } from '../core/types';
import {
  handleAvif,
  handleJpeg,
  handlePng,
  handleWebp,
  handleGif,
  handleSvg,
  handleTinify,
} from '../features/compress/codecs';

/**
 * Worker 线程入口：仅处理密集型图片任务。
 * 设计意图：将 CPU/IO 重操作与主线程解耦，提升吞吐与稳定性。
 */

if (!parentPort) {
  throw new Error('Worker must be started with worker_threads');
}

parentPort.postMessage({ type: 'ready' });

parentPort.on('message', async (message: { jobId: string; payload: CompressTaskPayload }) => {
  const { jobId, payload } = message;
  try {
    let result: unknown;

    switch (payload.codec) {
      case 'avif':
        result = await handleAvif(
          {
            codec: 'avif',
            inputPath: payload.inputPath,
            options: payload.options as any,
            processOptions: payload.processOptions as any,
          },
          (stage: 'starting' | 'processing' | 'writing' | 'converting' | 'completed') => {
            parentPort!.postMessage({ type: 'progress', data: { jobId, stage } });
          },
        );
        break;
      case 'jpeg':
        result = await handleJpeg(
          {
            codec: 'jpeg',
            inputPath: payload.inputPath,
            options: payload.options as any,
            processOptions: payload.processOptions as any,
          },
          (stage: 'starting' | 'processing' | 'writing' | 'converting' | 'completed') => {
            parentPort!.postMessage({ type: 'progress', data: { jobId, stage } });
          },
        );
        break;
      case 'png':
        result = await handlePng(
          {
            codec: 'png',
            inputPath: payload.inputPath,
            options: payload.options as any,
            processOptions: payload.processOptions as any,
          },
          (stage: 'starting' | 'processing' | 'writing' | 'converting' | 'completed') => {
            parentPort!.postMessage({ type: 'progress', data: { jobId, stage } });
          },
        );
        break;
      case 'webp':
        result = await handleWebp(
          {
            codec: 'webp',
            inputPath: payload.inputPath,
            options: payload.options as any,
            processOptions: payload.processOptions as any,
          },
          (stage: 'starting' | 'processing' | 'writing' | 'converting' | 'completed') => {
            parentPort!.postMessage({ type: 'progress', data: { jobId, stage } });
          },
        );
        break;
      case 'gif':
        result = await handleGif(
          {
            codec: 'gif',
            inputPath: payload.inputPath,
            options: payload.options as any,
            processOptions: payload.processOptions as any,
          },
          (stage: 'starting' | 'processing' | 'writing' | 'converting' | 'completed') => {
            parentPort!.postMessage({ type: 'progress', data: { jobId, stage } });
          },
        );
        break;
      case 'svg':
        result = await handleSvg(
          {
            codec: 'svg',
            inputPath: payload.inputPath,
            options: payload.options as any,
          },
          (stage: 'starting' | 'processing' | 'writing' | 'completed') => {
            parentPort!.postMessage({ type: 'progress', data: { jobId, stage } });
          },
        );
        break;
      case 'tinify':
        result = await handleTinify(
          {
            codec: 'tinify',
            inputPath: payload.inputPath,
            options: payload.options as any,
            processOptions: payload.processOptions as any,
          },
          (stage: 'starting' | 'processing' | 'writing' | 'converting' | 'completed') => {
            parentPort!.postMessage({ type: 'progress', data: { jobId, stage } });
          },
        );
        break;
      case 'tiff':
        // 延用通用阶段进度回调
        // 为了避免引入新的 import 破坏现有格式，这里动态导入 handleTiff
        const { handleTiff } = await import('../features/compress/codecs/tiff');
        result = await handleTiff(
          {
            codec: 'tiff',
            inputPath: payload.inputPath,
            options: payload.options as any,
            processOptions: payload.processOptions as any,
          },
          (stage: 'starting' | 'processing' | 'writing' | 'converting' | 'completed') => {
            parentPort!.postMessage({ type: 'progress', data: { jobId, stage } });
          },
        );
        break;
      default:
        throw new Error(`Unsupported codec: ${payload.codec}`);
    }

    parentPort!.postMessage({ type: 'result', data: result });
  } catch (error) {
    parentPort!.postMessage({
      type: 'error',
      data: error instanceof Error ? error.message : String(error),
    });
  }
});
