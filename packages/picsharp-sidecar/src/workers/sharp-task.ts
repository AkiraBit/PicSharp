import { parentPort } from 'node:worker_threads';
import { processPng } from '../services/compress/png';
import { processJpeg } from '../services/compress/jpeg';
import { processWebp } from '../services/compress/webp';
import { processAvif } from '../services/compress/avif';
import { processGif } from '../services/compress/gif';
import { processTiff } from '../services/compress/tiff';
import { processSvg } from '../services/compress/svg';
import { processTinyPng } from '../services/compress/tinypng';
import { getRawPixels } from '../services/codec';
import { generateThumbnail } from '../services/image-viewer';

if (!parentPort) {
  throw new Error('sharp-task must run in worker_threads');
}

parentPort.on('message', async (msg: { requestId: string; type: string; payload: any }) => {
  const { requestId, type, payload } = msg || {};
  if (!requestId) return;
  try {
    if (type === 'png') {
      const result = await processPng(payload);
      parentPort!.postMessage({ requestId, type: 'result', data: result });
    } else if (type === 'jpeg') {
      const result = await processJpeg(payload);
      parentPort!.postMessage({ requestId, type: 'result', data: result });
    } else if (type === 'webp') {
      const result = await processWebp(payload);
      parentPort!.postMessage({ requestId, type: 'result', data: result });
    } else if (type === 'avif') {
      const result = await processAvif(payload);
      parentPort!.postMessage({ requestId, type: 'result', data: result });
    } else if (type === 'gif') {
      const result = await processGif(payload);
      parentPort!.postMessage({ requestId, type: 'result', data: result });
    } else if (type === 'tiff') {
      const result = await processTiff(payload);
      parentPort!.postMessage({ requestId, type: 'result', data: result });
    } else if (type === 'svg') {
      const result = await processSvg(payload as any);
      parentPort!.postMessage({ requestId, type: 'result', data: result });
    } else if (type === 'codec:get-raw-pixels') {
      const { input_path } = payload as { input_path: string };
      const result = await getRawPixels(input_path);
      parentPort!.postMessage({ requestId, type: 'result', data: result });
    } else if (type === 'image:thumbnail') {
      const result = await generateThumbnail(payload as any);
      parentPort!.postMessage({ requestId, type: 'result', data: result });
    } else if (type === 'tinypng') {
      const result = await processTinyPng(payload);
      parentPort!.postMessage({ requestId, type: 'result', data: result });
    } else {
      throw new Error(`Unsupported task type: ${type}`);
    }
  } catch (error: any) {
    parentPort!.postMessage({
      requestId,
      type: 'error',
      data: { message: error?.message || String(error) },
    });
  }
});
