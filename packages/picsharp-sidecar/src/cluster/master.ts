import cluster from 'node:cluster';
import type { Worker as ClusterWorker } from 'node:cluster';
import { IpcEnvelope, IpcMessage } from '../ipc/messages';
import { AppConfig } from '../config';
import os from 'node:os';
import { captureError } from '../utils';

interface KvEntry {
  value: unknown;
  expireAt?: number;
}

const kvStore = new Map<string, KvEntry>();

function now() {
  return Date.now();
}

function cleanupKv() {
  const t = now();
  for (const [k, v] of kvStore.entries()) {
    if (v.expireAt && v.expireAt <= t) {
      kvStore.delete(k);
    }
  }
}

function handleMessage(worker: ClusterWorker, message: IpcMessage) {
  const { type, payload, requestId } = message as IpcEnvelope<string, any>;
  if (type === 'kv:set') {
    const { key, value, ttlMs } = payload as { key: string; value: unknown; ttlMs?: number };
    const entry: KvEntry = { value };
    if (ttlMs && ttlMs > 0) {
      entry.expireAt = now() + ttlMs;
    }
    kvStore.set(key, entry);
    if (requestId) {
      worker.send({ type: 'kv:ack', payload: { ok: true }, requestId } satisfies IpcMessage as any);
    }
  } else if (type === 'kv:get') {
    const { key } = payload as { key: string };
    const entry = kvStore.get(key);
    if (entry && entry.expireAt && entry.expireAt <= now()) {
      kvStore.delete(key);
    }
    const value = kvStore.get(key)?.value;
    if (requestId) {
      worker.send({
        type: 'kv:resp',
        payload: { key, value },
        requestId,
      } satisfies IpcMessage as any);
    }
  } else if (type === 'kv:del') {
    const { key } = payload as { key: string };
    kvStore.delete(key);
    if (requestId) {
      worker.send({ type: 'kv:ack', payload: { ok: true }, requestId } satisfies IpcMessage as any);
    }
  }
}

export async function startMaster(config: AppConfig) {
  if (!cluster.isPrimary) return;

  if (os.platform() !== 'win32') {
    cluster.schedulingPolicy = cluster.SCHED_RR;
  }
  cluster.setupPrimary({
    execArgv: process.execArgv,
  });

  if (config.store && typeof config.store === 'object') {
    for (const [k, v] of Object.entries(config.store)) {
      kvStore.set(k, { value: v });
    }
  }

  for (let i = 0; i < config.concurrency; i++) {
    const worker = cluster.fork(config);
    worker.on('message', (msg: IpcMessage) => handleMessage(worker, msg));
  }

  cluster.on('exit', (worker, code, signal) => {
    captureError(
      new Error(`Worker Exit`),
      {
        extra: {
          worker_id: worker.id,
          worker_pid: worker.process.pid,
          code,
          signal,
        },
      },
      'worker_exit',
    );
    console.error(
      JSON.stringify({
        msg: '[Worker Exit]',
        id: worker.id,
        pid: worker.process.pid,
        code,
        signal,
      }),
    );
    const w = cluster.fork(config);
    w.on('message', (msg: IpcMessage) => handleMessage(w, msg));
  });

  console.log(
    JSON.stringify({
      origin: `http://localhost:${config.port}`,
    }),
  );
}
