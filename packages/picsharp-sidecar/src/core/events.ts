import { EventEmitter } from 'node:events';
import { ProgressEvent } from './types';

class EventBus extends EventEmitter {
  emitProgress(event: ProgressEvent) {
    this.emit('progress', event);
  }

  onProgress(listener: (event: ProgressEvent) => void) {
    this.on('progress', listener);
  }

  emitJobEvent(event: {
    type: 'completed' | 'failed' | 'cancelled';
    jobId: string;
    result?: any;
    error?: string;
  }) {
    this.emit('job_event', event);
  }
}

export const eventBus = new EventBus();
