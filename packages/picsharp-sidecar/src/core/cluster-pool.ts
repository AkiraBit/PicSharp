import { EventEmitter } from 'node:events';
import { fork, ChildProcess } from 'node:child_process';
import path from 'node:path';

export interface ClusterPoolOptions {
  size: number;
  childFile: string; // absolute path to compiled child js
}

export class ClusterPool<TPayload, TResult> extends EventEmitter {
  private size: number;
  private childFile: string;
  private children: ChildProcess[] = [];
  private idle: ChildProcess[] = [];
  private running = new Map<
    ChildProcess,
    { jobId: string; resolve: (value: TResult) => void; reject: (reason?: unknown) => void }
  >();

  constructor(options: ClusterPoolOptions) {
    super();
    this.size = options.size;
    this.childFile = options.childFile;
  }

  async start(): Promise<void> {
    for (let i = 0; i < this.size; i++) {
      this.spawn();
    }
  }

  private spawn() {
    const child = fork(this.childFile, [], { stdio: ['inherit', 'inherit', 'inherit', 'ipc'] });
    this.children.push(child);

    const onMessage = (message: any) => {
      if (message?.type === 'progress') {
        this.emit('progress', message.data);
        return;
      }
      if (message?.type === 'result') {
        const ctx = this.running.get(child);
        if (!ctx) return;
        this.running.delete(child);
        this.idle.push(child);
        ctx.resolve(message.data as TResult);
        this.emit('idle');
        return;
      }
      if (message?.type === 'error') {
        const ctx = this.running.get(child);
        if (!ctx) return;
        this.running.delete(child);
        this.idle.push(child);
        ctx.reject(message.data);
        this.emit('idle');
        return;
      }
      if (message?.type === 'ready') {
        if (!this.idle.includes(child)) {
          this.idle.push(child);
          this.emit('idle');
        }
      }
    };

    const onExit = () => {
      this.running.delete(child);
      const idx = this.children.indexOf(child);
      if (idx >= 0) this.children.splice(idx, 1);
      const idleIdx = this.idle.indexOf(child);
      if (idleIdx >= 0) this.idle.splice(idleIdx, 1);
      this.spawn();
    };

    child.on('message', onMessage);
    child.on('exit', onExit);
  }

  private acquire(): Promise<ChildProcess> {
    if (this.idle.length > 0) {
      const child = this.idle.shift()!;
      return Promise.resolve(child);
    }
    return new Promise((resolve) => {
      const onIdle = () => {
        this.off('idle', onIdle);
        resolve(this.idle.shift()!);
      };
      this.on('idle', onIdle);
    });
  }

  async run(jobId: string, payload: TPayload): Promise<TResult> {
    const child = await this.acquire();
    return new Promise<TResult>((resolve, reject) => {
      this.running.set(child, { jobId, resolve, reject });
      child.send({ jobId, payload });
    });
  }

  getSize(): number {
    return this.children.length;
  }
  getIdleCount(): number {
    return this.idle.length;
  }
  getRunningCount(): number {
    return this.running.size;
  }
}
