import { Hono } from 'hono';
import type { Context } from 'hono';
import { eventBus } from '../core/events';
import { ReadableStream } from 'node:stream/web';

export function createJobsSSERouter() {
  const app = new Hono();

  app.get('/:jobId/stream', (c) => streamJob(c));

  return app;
}

function streamJob(c: Context) {
  const jobId = c.req.param('jobId');
  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();

      const onProgress = (event: any) => {
        if (event.jobId === jobId) {
          const chunk = `event: progress\ndata: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(chunk));
        }
      };

      eventBus.onProgress(onProgress);

      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(`: keep-alive\n\n`));
      }, 15000);

      c.req.raw.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        eventBus.off('progress', onProgress);
        controller.close();
      });
    },
  });

  return new Response(stream as any, { headers: c.res.headers });
}
