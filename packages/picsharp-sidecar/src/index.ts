import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { timeout } from 'hono/timeout';
import svg from './controllers/compress/svg';
import jpeg from './controllers/compress/jpeg';
import png from './controllers/compress/png';
import webp from './controllers/compress/webp';
import gif from './controllers/compress/gif';
import avif from './controllers/compress/avif';
import tiff from './controllers/compress/tiff';
import tinify from './controllers/compress/tinify';
import { findAvailablePort } from './utils';
import { HTTPException } from 'hono/http-exception';
import watch from './controllers/watch';

async function main() {
  const argv = yargs(hideBin(process.argv))
    .locale('en')
    .option('port', {
      alias: 'p',
      description: 'Server port',
      type: 'number',
      default: 3000,
    })
    .help()
    .alias('help', 'h')
    .parseSync();

  const PORT = await findAvailablePort(argv.port);

  const app = new Hono()
    .use(logger())
    .use('*', cors())
    .use(
      '*',
      timeout(30000, (context) => {
        return new HTTPException(500, {
          message: `Process timeout. Please try again.`,
        });
      }),
    )
    .onError((err, c) => {
      console.error('[ERROR Catch]', err);
      return c.json(
        {
          status: 500,
          message: err.message || err.toString() || 'Internal Server Error',
        },
        500,
      );
    })
    .get('/', (c) => {
      return c.text('Picsharp Sidecar');
    })
    .get('/ping', (c) => {
      return c.text('pong');
    })
    .route('/compress/svg', svg)
    .route('/compress/jpeg', jpeg)
    .route('/compress/png', png)
    .route('/compress/webp', webp)
    .route('/compress/gif', gif)
    .route('/compress/avif', avif)
    .route('/compress/tiff', tiff)
    .route('/compress/tinify', tinify)
    .route('/watch', watch);

  serve(
    {
      fetch: app.fetch,
      port: PORT,
    },
    (info) => {
      console.log(
        JSON.stringify({
          origin: `http://localhost:${info.port}`,
        }),
      );
    },
  );
}

main();
