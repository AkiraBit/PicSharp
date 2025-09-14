import { parentPort } from 'node:worker_threads';
import { processPngLossy, processPngLossless } from '../services/compress/png';
import { processJpeg } from '../services/compress/jpeg';
import { processWebp } from '../services/compress/webp';
import { processAvif } from '../services/compress/avif';
import { processGif } from '../services/compress/gif';
import { processTiff } from '../services/compress/tiff';
import { processSvg } from '../services/compress/svg';
import { processTinyPng } from '../services/compress/tinypng';
import { getRawPixels, toBase64 } from '../services/codec';
import { generateThumbnail } from '../services/image-viewer';
import { CompressError } from '../extends/CompressError';

if (!parentPort) {
  throw new Error('dispatcher must run in worker_threads');
}

parentPort.on('message', async (msg: { requestId: string; type: string; payload: any }) => {
  const { requestId, type, payload } = msg || {};
  if (!requestId) return;
  try {
    if (type === 'png') {
      const result = await processPngLossy(payload);
      parentPort!.postMessage({ requestId, type: 'result', data: result });
    } else if (type === 'png-lossless') {
      const result = await processPngLossless(payload);
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
      const result = await getRawPixels(payload.input_path);
      parentPort!.postMessage({ requestId, type: 'result', data: result });
    } else if (type === 'codec:to-base64') {
      const result = await toBase64(payload.input_path);
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
  } catch (error: any | CompressError) {
    parentPort!.postMessage({
      requestId,
      error,
      errorPayload: error.payload,
    });
  }
});
