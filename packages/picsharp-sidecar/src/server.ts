import { serve } from '@hono/node-server';
import { loadConfig } from './config';
import { findAvailablePort } from './utils';
import { createApp } from './app';

interface StartServerOptions {
  port: number;
}

export async function startServer(options: StartServerOptions) {
  const config = loadConfig(options.port);
  const port = await findAvailablePort(config.port);

  const app = createApp();

  serve({ fetch: app.fetch, port }, (info) => {
    console.log(
      JSON.stringify({
        origin: `http://localhost:${info.port}`,
        port: info.port,
        pid: process.pid,
        argv: process.argv,
      }),
    );
  });
}
