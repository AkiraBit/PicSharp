import os from 'node:os';
import { findAvailablePort } from '../utils';

export interface AppConfig {
  port: number;
  concurrency: number;
  cluster: boolean;
  mode: 'server' | 'cli';
  store: Record<string, unknown>;
}

function parseNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'string') {
    const lowered = value.toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(lowered)) {
      return true;
    }
    if (['0', 'false', 'no', 'off'].includes(lowered)) {
      return false;
    }
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return fallback;
}

export async function loadConfig(): Promise<AppConfig> {
  const cpuCount = Math.max(1, Math.floor(os.cpus().length / 2));
  const concurrency = parseNumber(process.env.PICSHARP_SIDECAR_CONCURRENCY, cpuCount);
  const cluster = parseBoolean(process.env.PICSHARP_SIDECAR_CLUSTER, false);
  const port = await findAvailablePort(parseNumber(process.env.PICSHARP_SIDECAR_PORT, 3000));
  const mode =
    (String(process.env.PICSHARP_SIDECAR_MODE || 'server').toLowerCase() as AppConfig['mode']) ||
    'server';
  let store: Record<string, unknown> = {};
  if (process.env.PICSHARP_SIDECAR_STORE) {
    try {
      store = JSON.parse(String(process.env.PICSHARP_SIDECAR_STORE)) as Record<string, unknown>;
    } catch (e) {
      console.error('[shared-kv] invalid JSON');
      process.exit(1);
    }
  }

  return {
    port,
    concurrency,
    cluster,
    mode,
    store,
  };
}
