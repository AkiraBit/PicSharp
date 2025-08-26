export interface IpcEnvelope<T extends string, P = unknown> {
  type: T;
  payload: P;
  requestId?: string;
  from?: number;
}

export type IpcMessage =
  | IpcEnvelope<'kv:set', { key: string; value: unknown; ttlMs?: number }>
  | IpcEnvelope<'kv:get', { key: string }>
  | IpcEnvelope<'kv:del', { key: string }>
  | IpcEnvelope<'kv:resp', { key: string; value?: unknown }>
  | IpcEnvelope<'kv:ack', { ok: boolean }>
  | IpcEnvelope<'worker:ready', { pid: number }>
  | IpcEnvelope<'worker:metrics', { activeJobs?: number; rss?: number }>;

export interface IpcResponseMap {
  'kv:get': IpcEnvelope<'kv:resp', { key: string; value?: unknown }>; // response
  'kv:set': IpcEnvelope<'kv:ack', { ok: boolean }>;
  'kv:del': IpcEnvelope<'kv:ack', { ok: boolean }>;
}
