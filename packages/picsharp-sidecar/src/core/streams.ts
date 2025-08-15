interface Binding {
  streamId: string;
  clientId: string;
}

const jobBindings = new Map<string, Binding>();

export function bindJobToStream(jobId: string, streamId: string, clientId: string): void {
  jobBindings.set(jobId, { streamId, clientId });
}

export function getBinding(jobId: string): Binding | undefined {
  return jobBindings.get(jobId);
}

export function clearBinding(jobId: string): void {
  jobBindings.delete(jobId);
}
