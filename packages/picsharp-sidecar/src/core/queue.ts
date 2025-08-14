import { randomUUID } from 'node:crypto';
import { Job, JobState, QueueAddOptions } from './types';

interface InternalJob<TPayload, TResult> {
  job: Job<TPayload, TResult>;
  state: JobState<TResult>;
  resolve: (value: TResult | PromiseLike<TResult>) => void;
  reject: (reason?: unknown) => void;
}

export class InMemoryJobQueue<TPayload, TResult> {
  private maxAttempts: number;
  private queueMax: number;
  private pending: InternalJob<TPayload, TResult>[] = [];
  private idempotencyMap = new Map<string, string>();
  private states = new Map<string, JobState<TResult>>();

  constructor(options: { queueMax: number; maxAttempts?: number }) {
    this.queueMax = options.queueMax;
    this.maxAttempts = options.maxAttempts ?? 3;
  }

  get length(): number {
    return this.pending.length;
  }

  getState(jobId: string): JobState<TResult> | undefined {
    return this.states.get(jobId);
  }

  setState(jobId: string, partial: Partial<JobState<TResult>>): void {
    const prev = this.states.get(jobId);
    if (!prev) return;
    this.states.set(jobId, { ...prev, ...partial });
  }

  async add(
    type: Job['type'],
    payload: TPayload,
    options?: QueueAddOptions,
  ): Promise<{ jobId: string; promise: Promise<TResult> }> {
    if (this.pending.length >= this.queueMax) {
      throw Object.assign(new Error('Queue is full'), { code: 'QUEUE_FULL' });
    }

    const id = options?.idempotencyKey
      ? this.idempotencyMap.get(options.idempotencyKey)
      : undefined;
    const jobId = id ?? randomUUID();
    if (options?.idempotencyKey && !id) {
      this.idempotencyMap.set(options.idempotencyKey, jobId);
    }

    const job: Job<TPayload, TResult> = {
      id: jobId,
      type,
      payload,
      priority: options?.priority ?? 0,
      attempts: 0,
      createdAt: Date.now(),
    };

    const state: JobState<TResult> = {
      id: jobId,
      status: 'queued',
      queuedAt: Date.now(),
      attempts: 0,
    };

    let resolve!: (value: TResult | PromiseLike<TResult>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<TResult>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const entry: InternalJob<TPayload, TResult> = { job, state, resolve, reject };
    this.states.set(jobId, state);
    this.enqueue(entry);

    return { jobId, promise };
  }

  take(): InternalJob<TPayload, TResult> | undefined {
    return this.pending.shift();
  }

  private enqueue(entry: InternalJob<TPayload, TResult>) {
    // 简单优先级：数值越大优先
    this.pending.push(entry);
    this.pending.sort((a, b) => b.job.priority - a.job.priority);
  }

  succeed(jobId: string, result: TResult) {
    const state = this.states.get(jobId);
    if (!state) return;
    state.status = 'succeeded';
    state.finishedAt = Date.now();
    state.result = result;
  }

  fail(jobId: string, error: unknown) {
    const state = this.states.get(jobId);
    if (!state) return;
    state.status = 'failed';
    state.finishedAt = Date.now();
    state.error = error instanceof Error ? error.message : String(error);
  }

  cancel(jobId: string): boolean {
    const idx = this.pending.findIndex((e) => e.job.id === jobId);
    if (idx >= 0) {
      const entry = this.pending[idx];
      this.pending.splice(idx, 1);
      const state = this.states.get(jobId);
      if (state) {
        state.status = 'cancelled';
        state.finishedAt = Date.now();
      }
      // 通知等待方
      entry.reject({ code: 'CANCELLED', message: 'cancelled' });
      return true;
    }
    return false;
  }
}
