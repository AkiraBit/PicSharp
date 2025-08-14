import { InMemoryJobQueue } from './queue';
import { Job, JobState } from './types';
import { WorkerPool } from './worker-pool';
import { AppConfig } from '../config';
import { createJobLogger } from './logger';

export class Scheduler<TPayload, TResult> {
  private queue: InMemoryJobQueue<TPayload, TResult>;
  private pool: WorkerPool<TPayload, TResult>;
  private running = false;
  private config?: AppConfig;

  constructor(
    queue: InMemoryJobQueue<TPayload, TResult>,
    pool: WorkerPool<TPayload, TResult>,
    config?: AppConfig,
  ) {
    this.queue = queue;
    this.pool = pool;
    this.config = config;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.loop().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[Scheduler] fatal loop error', err);
    });
  }

  private async loop(): Promise<void> {
    while (this.running) {
      const entry = this.queue.take();
      if (!entry) {
        await new Promise((r) => setTimeout(r, 5));
        continue;
      }

      const { job, state, resolve, reject } = entry;
      state.status = 'running';
      state.startedAt = Date.now();
      state.attempts += 1;
      const jobLogger = createJobLogger(job.id, (job as any)?.payload?.codec);
      jobLogger.info({ event: 'start', attempts: state.attempts }, 'job started');

      try {
        const startedAt = Date.now();
        const result = await this.pool.run(job.id, job.payload);
        const elapsedMs = Date.now() - startedAt;
        this.queue.succeed(job.id, result);
        jobLogger.info({ event: 'success', elapsed_ms: elapsedMs }, 'job succeeded');
        resolve(result);
      } catch (err) {
        jobLogger.error({ event: 'error', err: (err as any)?.message }, 'job failed');
        // 简单重试策略，受 config.retry 控制
        const retryCfg = this.config?.retry;
        if (retryCfg?.enable && state.attempts < (retryCfg.maxAttempts || 3)) {
          const delay = Math.min(
            (retryCfg.backoffInitialMs || 1000) * 2 ** state.attempts,
            retryCfg.backoffMaxMs || 30000,
          );
          await new Promise((r) => setTimeout(r, delay));
          // 重新入队，提升优先级确保尽快重试
          this.queue.setState(job.id, { status: 'queued', error: undefined });
          // 将该任务放回队列头部（简单实现：直接修改内部队列不公开；此处走 add 并保留相同 jobId 不是很优雅，后续可优化）
          // 临时方案：直接再次调用 pool.run（不依赖 re-enqueue），避免破坏幂等逻辑
          try {
            const startedAt2 = Date.now();
            const res2 = await this.pool.run(job.id, job.payload);
            const elapsedMs2 = Date.now() - startedAt2;
            this.queue.succeed(job.id, res2);
            jobLogger.info(
              { event: 'success', elapsed_ms: elapsedMs2, retried: true },
              'job retried and succeeded',
            );
            resolve(res2);
          } catch (err2) {
            this.queue.fail(job.id, err2);
            jobLogger.error(
              { event: 'error', err: (err2 as any)?.message, retried: true },
              'job retried and failed',
            );
            reject(err2);
          }
        } else {
          this.queue.fail(job.id, err);
          jobLogger.error({ event: 'fatal', err: (err as any)?.message }, 'job failed finally');
          reject(err);
        }
      }
    }
  }
}
