import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { loadConfig } from './config';
import { findAvailablePort } from './utils';
import { createApp } from './app';
import { createRuntime } from './core/context';
import path from 'node:path';
import { WorkerPool } from './core/worker-pool';
import { ClusterPool } from './core/cluster-pool';
import { Scheduler } from './core/scheduler';

export async function startServer(cliPort?: number) {
  const config = loadConfig(cliPort);
  const port = await findAvailablePort(config.port);

  // 初始化 runtime: 队列 + worker 池 + 调度器
  const runtime = createRuntime<any, any>(config);

  // 启动 worker 池（支持 cluster 开关）
  const isDev = process.env.NODE_ENV !== 'production';
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
  app.get('/health', (c) =>
    c.json({
      status: 'ok',
      uptime: process.uptime(),
      queueLength: runtime.queue.length,
      workers: runtime.pool ? runtime.pool.getSize() : 0,
      workersIdle: runtime.pool ? runtime.pool.getIdleCount() : 0,
      workersRunning: runtime.pool ? runtime.pool.getRunningCount() : 0,
    }),
  );

  serve({ fetch: app.fetch, port }, (info) => {
    console.log(
      JSON.stringify({
        origin: `http://localhost:${info.port}`,
      }),
    );
  });
}
