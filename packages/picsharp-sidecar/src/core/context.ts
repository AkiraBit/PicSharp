import path from 'node:path';
import { AppConfig } from '../config';
import { InMemoryJobQueue } from './queue';
import { Scheduler } from './scheduler';
import { WorkerPool } from './worker-pool';

export interface AppRuntime<TPayload = any, TResult = any> {
  config: AppConfig;
  queue: InMemoryJobQueue<TPayload, TResult>;
  pool: WorkerPool<TPayload, TResult> | null;
  scheduler: Scheduler<TPayload, TResult> | null;
}

export function createRuntime<TPayload, TResult>(config: AppConfig): AppRuntime<TPayload, TResult> {
  const queue = new InMemoryJobQueue<TPayload, TResult>({ queueMax: config.queueMax });

  // 暂不启动 worker 池与调度器，等后续模块接入具体 worker
  const pool =
    config.concurrency > 0
      ? new WorkerPool<TPayload, TResult>({
          size: 0, // 模块 1 暂不启动，待模块 2 指定 workerFile 并设为 config.concurrency
          workerFile: path.join(__dirname, 'workers', 'image-worker.js'),
        })
      : null;

  const scheduler = pool ? new Scheduler<TPayload, TResult>(queue, pool) : null;

  return { config, queue, pool, scheduler };
}
