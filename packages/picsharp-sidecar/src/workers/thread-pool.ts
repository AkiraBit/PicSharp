import os from 'node:os';
import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { isDev } from '../utils';

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
  worker: Worker;
  busy: boolean;
  currentId?: string;
}

export interface ThreadPool {
  run<TReq, TRes>(task: PoolTask<TReq>, timeoutMs?: number): Promise<TRes>;
}

function getWorkerEntry(): string {
  if (isDev) {
    return path.join(__dirname, 'sharp-task.dev.js');
  }
  return path.join(__dirname, 'sharp-task.js');
}

function createWorkerInstance(): Worker {
  const entry = getWorkerEntry();
  return new Worker(entry);
}

let singletonPool: ThreadPool | undefined;

export function initThreadPool(): ThreadPool {
  const size = Math.max(1, Math.floor((os.cpus().length || 2) / 2));
  const poolSize = Number(process.env.PICSHARP_SIDECAR_THREADS) || size;
  const workers: PoolWorker[] = [];
  const pendings = new Map<string, Pending>();

  function nextId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function getIdle(): PoolWorker | undefined {
    return workers.find((w) => !w.busy);
  }

  function spawn() {
    const w = createWorkerInstance();
    const wrap: PoolWorker = { worker: w, busy: false };
    w.on('message', (msg: any) => {
      const { requestId, type, data, error } = msg || {};
      if (!requestId) return;
      const pending = pendings.get(requestId);
      if (!pending) return;
      if (pending.timeout) clearTimeout(pending.timeout);
      pendings.delete(requestId);
      wrap.busy = false;
      wrap.currentId = undefined;
      if (type === 'error') {
        pending.reject(new Error(data?.message || String(error || 'Unknown error')));
      } else {
        pending.resolve(data);
      }
    });
    w.on('error', (err) => {
      if (wrap.currentId) {
        const p = pendings.get(wrap.currentId);
        if (p) {
          if (p.timeout) clearTimeout(p.timeout);
          pendings.delete(wrap.currentId);
          p.reject(err);
        }
      }
    });
    w.on('exit', () => {
      const idx = workers.indexOf(wrap);
      if (idx >= 0) workers.splice(idx, 1);
      // respawn
      spawn();
    });
    workers.push(wrap);
  }

  for (let i = 0; i < poolSize; i++) spawn();

  async function run<TReq, TRes>(task: PoolTask<TReq>, timeoutMs = 180_000): Promise<TRes> {
    const idle = getIdle();
    if (!idle) {
      // 简易排队：轮询等待空闲
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
          reject(new Error('Task timeout'));
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
