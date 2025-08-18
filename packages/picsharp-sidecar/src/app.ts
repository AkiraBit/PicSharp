import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { timeout } from 'hono/timeout';
import { HTTPException } from 'hono/http-exception';
import { InMemoryJobQueue } from './core/queue';
import { createCodecRouter } from './router/api/codec';
import { createImageViewerRouter } from './router/api/image-viewer';

export function createApp(queue?: InMemoryJobQueue<any, any>) {
  const app = new Hono()
    .use(logger())
    .use('*', cors())
    .use(
      '*',
      timeout(
        30000,
        () => new HTTPException(500, { message: 'Process timeout. Please try again.' }),
      ),
    )
    .onError((err, c) => {
      console.error('[ERROR Catch]', err);
      return c.json({ status: 500, message: err.message || 'Internal Server Error' }, 500);
    })
    .get('/ping', (c) => c.text('pong'));
  app.route('/api/codec', createCodecRouter());
  app.route('/api/image-viewer', createImageViewerRouter());
  // .get('/health', (c) =>
  //   c.json({
  //     status: 'ok',
  //     queueLength: queue ? queue.length : 0,
  //   }),
  // )
  // .get('/api/health', (c) =>
  //   c.json({
  //     status: 'ok',
  //     queueLength: queue ? queue.length : 0,
  //   }),
  // );

  // if (queue) {
  //   // 普通接口（api 前缀）
  //   app.route('/api/jobs', createJobsRouter(queue));
  //   app.route('/api/watch', createWatchRouter(queue));
  //   app.route('/api/batch', createBatchRouter(queue));
  //   // 流式接口（stream 前缀：SSE）
  //   app.route('/stream/jobs', createJobsSSERouter());
  //   app.route('/stream/batch', createBatchSSERouter());
  // }

  return app;
}
