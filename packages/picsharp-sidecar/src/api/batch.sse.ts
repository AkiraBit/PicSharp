import { Hono } from 'hono';
import type { Context } from 'hono';
import { ReadableStream } from 'node:stream/web';
import { eventBus } from '../core/events';
import { clearBinding, getBinding } from '../core/streams';

export function createBatchSSERouter() {
  const app = new Hono();
  app.get('/:streamId', (c) => streamBatch(c));
  return app;
}

function streamBatch(c: Context) {
  const streamId = c.req.param('streamId');
  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (event: any) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

      const onProgress = (evt: any) => {
        // 忽略 progress，仅关注完成/失败
      };

      const onJobEvent = (evt: any) => {
        // 监听全局完成/失败事件（由 scheduler 成功/失败时发出）
        const binding = getBinding(evt.jobId);
        if (!binding || binding.streamId !== streamId) return;
        if (evt.type === 'completed' || evt.type === 'failed' || evt.type === 'cancelled') {
          send({
            event: evt.type,
            client_id: binding.clientId,
            job_id: evt.jobId,
            result: evt.result,
            error: evt.error,
          });
          clearBinding(evt.jobId);
        }
      };

      eventBus.on('progress', onProgress);
      eventBus.on('job_event', onJobEvent);

      const keepAlive = setInterval(
        () => controller.enqueue(encoder.encode(`: keep-alive\n\n`)),
        15000,
      );

      c.req.raw.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        eventBus.off('progress', onProgress);
        eventBus.off('job_event', onJobEvent);
        controller.close();
      });
    },
  });

  return new Response(stream as any, { headers: c.res.headers });
}
