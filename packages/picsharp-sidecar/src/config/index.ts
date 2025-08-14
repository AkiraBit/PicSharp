import os from 'node:os';

export interface AppConfig {
  port: number;
  concurrency: number;
  queueMax: number;
  jobTimeoutMs: number;
  useCluster: boolean;
  tmpDir?: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  retry: {
    enable: boolean;
    maxAttempts: number;
    backoffInitialMs: number;
    backoffMaxMs: number;
  };
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

export function loadConfig(cliPort?: number): AppConfig {
  const cpuCount = Math.max(1, os.cpus().length - 1);

  const concurrency = parseNumber(process.env.PICSHARP_CONCURRENCY, cpuCount);
  const queueMax = parseNumber(process.env.PICSHARP_QUEUE_MAX, 1000);
  const jobTimeoutMs = parseNumber(process.env.PICSHARP_JOB_TIMEOUT_MS, 180000);
  const useCluster = parseBoolean(process.env.PICSHARP_USE_CLUSTER, false);
  const tmpDir = process.env.PICSHARP_TMP_DIR || undefined;
  const logLevelEnv = (process.env.PICSHARP_LOG_LEVEL || 'info').toLowerCase();
  const logLevel: AppConfig['logLevel'] = ['debug', 'info', 'warn', 'error'].includes(logLevelEnv)
    ? (logLevelEnv as AppConfig['logLevel'])
    : 'info';

  const port = parseNumber(cliPort, parseNumber(process.env.PORT, 3000));

  return {
    port,
    concurrency,
    queueMax,
    jobTimeoutMs,
    useCluster,
    tmpDir,
    logLevel,
    retry: {
      enable: parseBoolean(process.env.PICSHARP_RETRY_ENABLE, true),
      maxAttempts: parseNumber(process.env.PICSHARP_RETRY_MAX_ATTEMPTS, 3),
      backoffInitialMs: parseNumber(process.env.PICSHARP_RETRY_BACKOFF_INITIAL_MS, 1000),
      backoffMaxMs: parseNumber(process.env.PICSHARP_RETRY_BACKOFF_MAX_MS, 30000),
    },
  };
}
