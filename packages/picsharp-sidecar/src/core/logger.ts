import pino from 'pino';

export const logger = pino({
  level: process.env.PICSHARP_LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

export function createJobLogger(jobId: string, codec?: string) {
  return logger.child({ job_id: jobId, codec });
}
