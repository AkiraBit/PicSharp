export interface CompressTaskPayload {
  codec: 'svg' | 'jpeg' | 'jpg' | 'png' | 'webp' | 'gif' | 'avif' | 'tiff' | 'tinify';
  inputPath: string;
  options: Record<string, unknown>;
  processOptions: Record<string, unknown>;
}

export interface Job<TPayload = unknown, TResult = unknown> {
  id: string;
  type: 'compress' | string;
  payload: TPayload;
  priority: number;
  attempts: number;
  createdAt: number;
}

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface JobState<TResult = unknown> {
  id: string;
  status: JobStatus;
  error?: string;
  progress?: number;
  result?: TResult;
  queuedAt: number;
  startedAt?: number;
  finishedAt?: number;
  attempts: number;
}

export interface ProgressEvent {
  jobId: string;
  stage:
    | 'queued'
    | 'starting'
    | 'reading'
    | 'processing'
    | 'writing'
    | 'converting'
    | 'hashing'
    | 'completed'
    | 'failed'
    | 'cancelled';
  progress?: number;
  message?: string;
}

export interface QueueAddOptions {
  priority?: number;
  idempotencyKey?: string;
  maxAttempts?: number;
}
