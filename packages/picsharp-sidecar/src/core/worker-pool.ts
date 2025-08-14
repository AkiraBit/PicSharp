import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { EventEmitter } from 'node:events';

export interface WorkerMessage<T = unknown> {
  type: 'ready' | 'progress' | 'result' | 'error';
  data?: T;
}

export interface WorkerTask<TPayload> {
  jobId: string;
  payload: TPayload;
}

export interface WorkerPoolOptions {
  size: number;
  workerFile: string; // absolute path to worker js
}

export class WorkerPool<TPayload, TResult> extends EventEmitter {
  private size: number;
  private workerFile: string;
  private workers: Worker[] = [];
  private idle: Worker[] = [];
  private running = new Map<
    Worker,
    { jobId: string; resolve: (value: TResult) => void; reject: (reason?: unknown) => void }
  >();

  constructor(options: WorkerPoolOptions) {
    super();
    this.size = options.size;
    this.workerFile = options.workerFile;
  }

  async start(): Promise<void> {
    for (let i = 0; i < this.size; i++) {
      this.spawn();
    }
  }

  private spawn() {
    const worker = new Worker(this.workerFile);
    this.workers.push(worker);

    const onMessage = (message: WorkerMessage) => {
      if (message.type === 'progress') {
        this.emit('progress', message.data);
        return;
      }
      if (message.type === 'result') {
        const ctx = this.running.get(worker);
        if (!ctx) return;
        this.running.delete(worker);
        this.idle.push(worker);
        ctx.resolve(message.data as TResult);
        this.emit('idle');
        return;
      }
      if (message.type === 'error') {
        const ctx = this.running.get(worker);
        if (!ctx) return;
        this.running.delete(worker);
        this.idle.push(worker);
        ctx.reject(message.data);
        this.emit('idle');
        return;
      }
      if (message.type === 'ready') {
        if (!this.idle.includes(worker)) {
          this.idle.push(worker);
          this.emit('idle');
        }
      }
    };

    const onExit = () => {
      this.running.delete(worker);
      const idx = this.workers.indexOf(worker);
      if (idx >= 0) this.workers.splice(idx, 1);
      const idleIdx = this.idle.indexOf(worker);
      if (idleIdx >= 0) this.idle.splice(idleIdx, 1);
      // respawn to keep pool size
      this.spawn();
    };

    worker.on('message', onMessage);
    worker.on('exit', onExit);
  }

  async run(jobId: string, payload: TPayload): Promise<TResult> {
    const worker = await this.acquire();
    return new Promise<TResult>((resolve, reject) => {
      this.running.set(worker, { jobId, resolve, reject });
      worker.postMessage({ jobId, payload } satisfies WorkerTask<TPayload>);
    });
  }

  private acquire(): Promise<Worker> {
    if (this.idle.length > 0) {
      const worker = this.idle.shift()!;
      return Promise.resolve(worker);
    }
    return new Promise<Worker>((resolve) => {
      const onIdle = () => {
        this.off('idle', onIdle);
        resolve(this.idle.shift()!);
      };
      this.on('idle', onIdle);
    });
  }

  getSize(): number {
    return this.workers.length;
  }

  getIdleCount(): number {
    return this.idle.length;
  }

  getRunningCount(): number {
    return this.running.size;
  }
}
