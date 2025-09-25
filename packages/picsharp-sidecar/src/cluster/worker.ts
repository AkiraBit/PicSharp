import cluster from 'node:cluster';
import { serve } from '@hono/node-server';
import { createApp } from '../app';
import { IpcMessage } from '../ipc/messages';
import { AppConfig } from '../config';
import { HOSTNAME } from '../constants';

export async function startWorker(config: AppConfig) {
  if (cluster.isPrimary) return;

  const app = createApp();

  serve({ fetch: app.fetch, port: config.port, hostname: HOSTNAME }, (info) => {
    console.log(`[worker]: worker_id:${cluster.worker?.id}  pid:${process.pid}`);
  });

  if (process.send) {
    const msg: IpcMessage = { type: 'worker:ready', payload: { pid: process.pid } } as any;
    process.send(msg);
  }
}
