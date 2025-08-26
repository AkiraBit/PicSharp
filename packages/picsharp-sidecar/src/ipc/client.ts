import { IpcEnvelope, IpcMessage } from './messages';

interface PendingRequest<T = any> {
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

function createRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export interface WorkerIpcClient {
  kvGet<T = unknown>(key: string): Promise<T | undefined>;
  kvSet(key: string, value: unknown, ttlMs?: number): Promise<void>;
  kvDel(key: string): Promise<void>;
}

export function createWorkerIpcClient(): WorkerIpcClient {
  const pendings = new Map<string, PendingRequest>();

  function onMessage(message: IpcMessage) {
    const { type, requestId, payload } = message as IpcEnvelope<string, any>;
    if (!requestId) return;
    const pending = pendings.get(requestId);
    if (!pending) return;
    if (type === 'kv:resp') {
      pendings.delete(requestId);
      pending.resolve((payload?.value ?? undefined) as any);
    } else if (type === 'kv:ack') {
      pendings.delete(requestId);
      pending.resolve(undefined);
    }
  }

  if (typeof process !== 'undefined') {
    process.on('message', onMessage as any);
  }

  function send<TPayload>(message: IpcEnvelope<string, TPayload>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const requestId = message.requestId || createRequestId();
      pendings.set(requestId, { resolve, reject });
      const full: IpcEnvelope<string, TPayload> = { ...message, requestId };
      if (!process.send) {
        pendings.delete(requestId);
        return reject(new Error('IPC is not available in worker'));
      }
      process.send(full as unknown as IpcMessage);
    });
  }

  return {
    async kvGet<T>(key: string): Promise<T | undefined> {
      const requestId = createRequestId();
      return (await send({ type: 'kv:get', payload: { key }, requestId })) as T | undefined;
    },
    async kvSet(key: string, value: unknown, ttlMs?: number): Promise<void> {
      const requestId = createRequestId();
      await send({ type: 'kv:set', payload: { key, value, ttlMs }, requestId });
    },
    async kvDel(key: string): Promise<void> {
      const requestId = createRequestId();
      await send({ type: 'kv:del', payload: { key }, requestId });
    },
  };
}
