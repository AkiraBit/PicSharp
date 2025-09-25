import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { timeout } from 'hono/timeout';
import { bearerAuth } from 'hono/bearer-auth';
import { HTTPException } from 'hono/http-exception';
import { createCodecRouter } from './controllers/codec';
import { createImageViewerRouter } from './controllers/image-viewer';
import png from './controllers/compress/png';
import avif from './controllers/compress/avif';
import gif from './controllers/compress/gif';
import webp from './controllers/compress/webp';
import jpg from './controllers/compress/jpeg';
import tiff from './controllers/compress/tiff';
import svg from './controllers/compress/svg';
import tinify from './controllers/compress/tinypng';
import watch from './controllers/watch';
import createKvAdminRouter from './controllers/admin/kv';
import Sentry from '@sentry/node';
import { captureError } from './utils';

export function createApp() {
  const app = new Hono()
    .use(logger())
    .use(
      '*',
      cors({
        origin: '*',
        maxAge: 600,
      }),
    )
    .use(
      '*',
      timeout(60000 * 3, () => new HTTPException(500, { message: 'Process timeout' })),
    )
    // .use(
    //   '/api/*',
    //   bearerAuth({
    //     token: 'picsharp_sidecar',
    //     invalidTokenMessage: 'Permission denied',
    //     invalidAuthenticationHeaderMessage: 'Permission denied',
    //     noAuthenticationHeaderMessage: 'Permission denied',
    //   }),
    // )
    // .use(
    //   '/stream/*',
    //   bearerAuth({
    //     token: 'picsharp_sidecar',
    //     invalidTokenMessage: 'Permission denied',
    //     invalidAuthenticationHeaderMessage: 'Permission denied',
    //     noAuthenticationHeaderMessage: 'Permission denied',
    //   }),
    // )
    .onError(async (error, c) => {
      console.error('[ERROR Catch]', error);
      if (error instanceof HTTPException) {
        const response = error.getResponse();
        const data = await response.json();
        captureError(new Error(data.message || 'Internal Server Error'));
        return c.json(
          {
            status: 500,
            data,
            message: data.message || 'Internal Server Error',
          },
          500,
        );
      }
      captureError(error);
      return c.json({ status: 500, message: error.message || 'Internal Server Error' }, 500);
    })
    // .use((c, next) => {
    //   const headers = c.req.header();
    //   if (headers['x-user-id']) {
    //     Sentry.setUser({
    //       id: headers['x-user-id'],
    //     });
    //   }

    // Only set project tag if session has project data
    // @ts-ignore
    // if (c?.session?.projectId !== undefined && c?.session?.projectId !== null) {
    //   // @ts-ignore
    //   Sentry.setTag('project_id', c?.session.projectId);
    // }

    //   return next();
    // })
    .get('/ping', (c) => c.text('pong'))
    .get('/debug-sentry', () => {
      Sentry.logger.info('User triggered test error', {
        action: 'test_error_endpoint',
      });
      throw new Error('My first Sentry error!');
    });
  app.route('/api/codec', createCodecRouter());
  app.route('/api/image-viewer', createImageViewerRouter());
  app.route('/api/compress/png', png);
  app.route('/api/compress/avif', avif);
  app.route('/api/compress/gif', gif);
  app.route('/api/compress/webp', webp);
  app.route('/api/compress/jpg', jpg);
  app.route('/api/compress/jpeg', jpg);
  app.route('/api/compress/tiff', tiff);
  app.route('/api/compress/tif', tiff);
  app.route('/api/compress/svg', svg);
  app.route('/api/compress/tinify', tinify);
  app.route('/stream/watch', watch);
  // app.route('/admin/kv', createKvAdminRouter());

  return app;
}
