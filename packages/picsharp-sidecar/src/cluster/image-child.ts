import {
  handleAvif,
  handleJpeg,
  handlePng,
  handleWebp,
  handleGif,
  handleSvg,
  handleTinify,
  handleTiff,
} from '../features/compress/codecs';

interface ChildMessage {
  jobId: string;
  payload: any;
}

process.send?.({ type: 'ready' });

process.on('message', async (message: ChildMessage) => {
  const { jobId, payload } = message;
  try {
    let result: unknown;
    const onProgress = (stage: string) => {
      process.send?.({ type: 'progress', data: { jobId, stage } });
    };

    switch (payload.codec) {
      case 'avif':
        result = await handleAvif(payload, onProgress);
        break;
      case 'jpeg':
        result = await handleJpeg(payload, onProgress);
        break;
      case 'png':
        result = await handlePng(payload, onProgress);
        break;
      case 'webp':
        result = await handleWebp(payload, onProgress);
        break;
      case 'gif':
        result = await handleGif(payload, onProgress);
        break;
      case 'svg':
        result = await handleSvg(payload as any, onProgress as any);
        break;
      case 'tinify':
        result = await handleTinify(payload, onProgress);
        break;
      case 'tiff':
        result = await handleTiff(payload, onProgress);
        break;
      default:
        throw new Error(`Unsupported codec: ${payload.codec}`);
    }

    process.send?.({ type: 'result', data: result });
  } catch (error) {
    process.send?.({ type: 'error', data: error instanceof Error ? error.message : String(error) });
  }
});
