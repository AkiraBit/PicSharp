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
        result = await handleAvif(payload);
        break;
      case 'jpeg':
        result = await handleJpeg(payload);
        break;
      case 'png':
        result = await handlePng(payload);
        break;
      case 'webp':
        result = await handleWebp(payload);
        break;
      case 'gif':
        result = await handleGif(payload);
        break;
      case 'svg':
        result = await handleSvg(payload as any);
        break;
      case 'tinify':
        result = await handleTinify(payload);
        break;
      case 'tiff':
        result = await handleTiff(payload);
        break;
      default:
        throw new Error(`Unsupported codec: ${payload.codec}`);
    }

    process.send?.({ type: 'result', data: result });
  } catch (error) {
    process.send?.({ type: 'error', data: error instanceof Error ? error.message : String(error) });
  }
});
