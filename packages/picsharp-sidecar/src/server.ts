import { serve } from '@hono/node-server';
import { loadConfig } from './config';
import { findAvailablePort } from './utils';
import { createApp } from './app';
import { createRuntime } from './core/context';
import path from 'node:path';
import { WorkerPool } from './core/worker-pool';
import { ClusterPool } from './core/cluster-pool';
import { Scheduler } from './core/scheduler';
import { isDev } from './utils';

interface StartServerOptions {
  port: number;
}

export async function startServer(options: StartServerOptions) {
  const config = loadConfig(options.port);
  const port = await findAvailablePort(config.port);

  const runtime = createRuntime<any, any>(config);

  if (config.useCluster) {
    const childFile = path.join(
      __dirname,
      'cluster',
      isDev ? 'image-child.dev.js' : 'image-child.js',
    );
    runtime.pool = new ClusterPool({
      size: config.concurrency,
      childFile,
    }) as unknown as WorkerPool<any, any>;
  } else {
    const workerFile = path.join(
      __dirname,
      'workers',
      isDev ? 'image-worker.dev.js' : 'image-worker.js',
    );
    runtime.pool = new WorkerPool({ size: config.concurrency, workerFile });
  }
  await runtime.pool!.start();

  runtime.scheduler = new Scheduler(runtime.queue, runtime.pool!, config);
  runtime.scheduler.start();

  const app = createApp(runtime.queue);
  // 增强健康检查：返回队列与 worker 池指标
  // app.get('/health', (c) =>
  //   c.json({
  //     status: 'ok',
  //     uptime: process.uptime(),
  //     queueLength: runtime.queue.length,
  //     workers: runtime.pool ? runtime.pool.getSize() : 0,
  //     workersIdle: runtime.pool ? runtime.pool.getIdleCount() : 0,
  //     workersRunning: runtime.pool ? runtime.pool.getRunningCount() : 0,
  //   }),
  // );

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
