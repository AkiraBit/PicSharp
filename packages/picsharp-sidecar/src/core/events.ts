import { EventEmitter } from 'node:events';
import { ProgressEvent } from './types';

class EventBus extends EventEmitter {
  emitProgress(event: ProgressEvent) {
    this.emit('progress', event);
  }

  onProgress(listener: (event: ProgressEvent) => void) {
    this.on('progress', listener);
  }
}

export const eventBus = new EventBus();
