import { parentPort, threadId } from 'node:worker_threads';
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

if (!parentPort) {
  throw new Error('Worker must be started with worker_threads');
}

console.log('[Worker] ready: ', threadId);
parentPort.postMessage({ type: 'ready' });

parentPort.on('message', async (message: { jobId: string; payload: CompressTaskPayload }) => {
  const { jobId, payload } = message;
  try {
    let result: unknown;

    switch (payload.codec) {
      case 'avif':
        result = await handleAvif({
          inputPath: payload.inputPath,
          options: payload.options as any,
          processOptions: payload.processOptions as any,
        });
        break;
      case 'jpeg':
      case 'jpg':
        result = await handleJpeg({
          inputPath: payload.inputPath,
          options: payload.options as any,
          processOptions: payload.processOptions as any,
        });
        break;
      case 'png':
        result = await handlePng({
          inputPath: payload.inputPath,
          options: payload.options as any,
          processOptions: payload.processOptions as any,
        });
        break;
      case 'webp':
        result = await handleWebp({
          inputPath: payload.inputPath,
          options: payload.options as any,
          processOptions: payload.processOptions as any,
        });
        break;
      case 'gif':
        result = await handleGif({
          inputPath: payload.inputPath,
          options: payload.options as any,
          processOptions: payload.processOptions as any,
        });
        break;
      case 'svg':
        result = await handleSvg({
          inputPath: payload.inputPath,
          options: payload.options as any,
        });
        break;
      case 'tinify':
        result = await handleTinify({
          inputPath: payload.inputPath,
          options: payload.options as any,
          processOptions: payload.processOptions as any,
        });
        break;
      case 'tiff':
        // 延用通用阶段进度回调
        // 为了避免引入新的 import 破坏现有格式，这里动态导入 handleTiff
        const { handleTiff } = await import('../features/compress/codecs/tiff');
        result = await handleTiff({
          inputPath: payload.inputPath,
          options: payload.options as any,
          processOptions: payload.processOptions as any,
        });
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
