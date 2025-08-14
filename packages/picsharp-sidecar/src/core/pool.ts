export interface TaskPool<TPayload, TResult> {
  start(): Promise<void> | void;
  run(jobId: string, payload: TPayload): Promise<TResult>;
  getSize(): number;
  getIdleCount(): number;
  getRunningCount(): number;
}
