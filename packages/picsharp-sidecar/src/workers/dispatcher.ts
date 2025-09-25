import { parentPort, threadId } from 'node:worker_threads';
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
    let result: any = null;
    if (type === 'png') {
      result = await processPngLossy(payload);
    } else if (type === 'png-lossless') {
      result = await processPngLossless(payload);
    } else if (type === 'jpeg') {
      result = await processJpeg(payload);
    } else if (type === 'webp') {
      result = await processWebp(payload);
    } else if (type === 'avif') {
      result = await processAvif(payload);
    } else if (type === 'gif') {
      result = await processGif(payload);
    } else if (type === 'tiff') {
      result = await processTiff(payload);
    } else if (type === 'svg') {
      result = await processSvg(payload as any);
    } else if (type === 'codec:get-raw-pixels') {
      result = await getRawPixels(payload.input_path);
    } else if (type === 'codec:to-base64') {
      result = await toBase64(payload.input_path);
    } else if (type === 'image:thumbnail') {
      result = await generateThumbnail(payload as any);
    } else if (type === 'tinypng') {
      result = await processTinyPng(payload);
    } else {
      throw new Error(`Unsupported task type: ${type}`);
    }
    result._threadId = threadId;
    parentPort!.postMessage({ requestId, type: 'result', data: result });
  } catch (error: any | CompressError) {
    parentPort!.postMessage({
      requestId,
      error,
      errorPayload: error.payload,
    });
  }
});
