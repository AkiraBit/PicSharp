import cluster from 'node:cluster';
import { serve } from '@hono/node-server';
import { AppConfig } from './config';
import { createApp } from './app';
import { startMaster } from './cluster/master';
import { startWorker } from './cluster/worker';

export async function startServer(config: AppConfig) {
  if (config.cluster) {
    if (cluster.isPrimary) {
      await startMaster(config);
    } else {
      await startWorker(config);
    }
  } else {
    const app = createApp();
    serve({ fetch: app.fetch, port: config.port, hostname: '::' }, (info) => {
      console.log(JSON.stringify({ origin: `http://localhost:${info.port}` }));
    });
  }
}
