import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { timeout } from 'hono/timeout';
import { HTTPException } from 'hono/http-exception';
import { InMemoryJobQueue } from './core/queue';
import { createCompressRouter } from './features/compress/router';
import { createJobsRouter } from './api/jobs.router';
import { createJobsSSERouter } from './api/jobs.sse';
import { createWatchRouter } from './features/watch/router';
import { createBatchRouter } from './api/batch.router';
import { createBatchSSERouter } from './api/batch.sse';

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
    .get('/ping', (c) => c.text('pong'))
    .get('/health', (c) =>
      c.json({
        status: 'ok',
        queueLength: queue ? queue.length : 0,
      }),
    );

  if (queue) {
    app.route('/v2/compress', createCompressRouter(queue));
    app.route('/v2/jobs', createJobsRouter(queue));
    app.route('/v2/jobs', createJobsSSERouter());
    app.route('/v2/watch', createWatchRouter(queue));
    app.route('/v2/batch', createBatchRouter(queue));
    app.route('/v2/batch', createBatchSSERouter());
  }

  return app;
}
