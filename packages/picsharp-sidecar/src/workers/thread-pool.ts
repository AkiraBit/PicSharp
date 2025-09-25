import os from 'node:os';
import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { isDev } from '../utils';
import Sentry from '@sentry/node';
import cluster from 'node:cluster';
import { captureError } from '../utils';

export type TaskType =
  | 'png'
  | 'png-lossless'
  | 'jpeg'
  | 'webp'
  | 'avif'
  | 'gif'
  | 'tiff'
  | 'svg'
  | 'tinypng';

export interface PoolTask<TPayload = any> {
  type: TaskType;
  payload: TPayload;
}

interface Pending<T = any> {
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
  timeout?: NodeJS.Timeout;
}

interface PoolWorker {
  id: number;
  worker: Worker;
  busy: boolean;
  currentId?: string;
}

export interface ThreadPool {
  run<TReq, TRes>(task: PoolTask<TReq>, timeoutMs?: number): Promise<TRes>;
}

function getWorkerEntry(): string {
  if (isDev) {
    return path.join(__dirname, 'dispatcher.dev.js');
  }
  return path.join(__dirname, 'dispatcher.js');
}

function createWorkerInstance(): Worker {
  const entry = getWorkerEntry();
  return new Worker(entry, {
    workerData: {
      workerId: cluster.worker?.id,
    },
  });
}

let singletonPool: ThreadPool | undefined;

export function initThreadPool(): ThreadPool {
  const size = Math.max(1, Math.floor(os.cpus().length || 2));
  const poolSize = Number(process.env.PICSHARP_SIDECAR_THREADS) || size;
  const workers: Map<number, PoolWorker> = new Map();
  const pendings = new Map<string, Pending>();

  function nextId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function getIdle(): PoolWorker | undefined {
    return Array.from(workers.values()).find((w) => !w.busy);
  }

  function spawn() {
    const w = createWorkerInstance();
    const wrap: PoolWorker = { id: w.threadId, worker: w, busy: false };
    w.on('message', (msg: any) => {
      const { requestId, data, error, errorPayload } = msg || {};
      if (!requestId) return;
      const pending = pendings.get(requestId);
      if (!pending) return;
      if (pending.timeout) clearTimeout(pending.timeout);
      pendings.delete(requestId);
      wrap.busy = false;
      wrap.currentId = undefined;
      if (error) {
        if (errorPayload) {
          Sentry.setContext('Error Payload', errorPayload);
        }
        pending.reject(error);
      } else {
        pending.resolve(data);
      }
    });
    w.on('error', (error) => {
      if (wrap.currentId) {
        const p = pendings.get(wrap.currentId);
        if (p) {
          if (p.timeout) clearTimeout(p.timeout);
          pendings.delete(wrap.currentId);
          p.reject(error);
          captureError(
            new Error(`[WorkerThread<${w.threadId}> Error]: ${error.message || error.toString()}`),
            undefined,
            'worker_thread_error',
          );
        }
      }
    });
    w.on('exit', (code) => {
      console.log(`[WorkerThread<${w.threadId}> Exit]:`, code);
      workers.delete(wrap.id);
      spawn();
      captureError(
        new Error(`[WorkerThread<${w.threadId}> Exit]: ${code}`),
        undefined,
        'worker_thread_exit',
      );
    });
    workers.set(wrap.id, wrap);
  }

  for (let i = 0; i < poolSize; i++) spawn();

  async function run<TReq, TRes>(task: PoolTask<TReq>, timeoutMs = 60_000 * 5): Promise<TRes> {
    const idle = getIdle();
    if (!idle) {
      await new Promise((r) => setTimeout(r, 5));
      return run(task, timeoutMs);
    }
    const requestId = nextId();
    idle.busy = true;
    idle.currentId = requestId;
    const result = new Promise<TRes>((resolve, reject) => {
      const pending: Pending = { resolve, reject };
      if (timeoutMs > 0) {
        pending.timeout = setTimeout(() => {
          pendings.delete(requestId);
          idle.busy = false;
          idle.currentId = undefined;
          reject(new Error(`Task Timeout: ${task.type}`));
        }, timeoutMs).unref();
      }
      pendings.set(requestId, pending);
      idle.worker.postMessage({ requestId, type: task.type, payload: task.payload });
    });
    return result;
  }

  return { run };
}

export function getThreadPool(): ThreadPool {
  if (singletonPool) return singletonPool;
  singletonPool = initThreadPool();
  return singletonPool;
}
