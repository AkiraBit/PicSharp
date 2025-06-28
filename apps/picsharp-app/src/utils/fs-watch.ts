import { watch, UnwatchFn } from '@tauri-apps/plugin-fs';
import { exists } from '@tauri-apps/plugin-fs';
import { get } from 'radash';

export interface WatchCallbacks {
  onCreate?: (type: 'file' | 'folder', paths: string[]) => void;
  onRemove?: (type: 'file' | 'folder', paths: string[]) => void;
  onRename?: (from: string, to: string) => void;
  onMove?: (to: string) => void;
  //   onModify?: (paths: string[]) => void;
}

export interface WatchEvent {
  type: {
    create?: { kind: 'file' | 'folder' };
    remove?: { kind: 'file' | 'folder' };
    modify?: {
      kind: string;
      mode: 'any' | 'both' | 'from' | 'to' | 'content';
    };
    other?: any;
  };
  paths: string[];
}

export interface WatchEventStrategy {
  handle(event: WatchEvent, callbacks: Partial<WatchCallbacks>): void;
}

export class CreateEventStrategy implements WatchEventStrategy {
  handle(event: WatchEvent, callbacks: Partial<WatchCallbacks>): void {
    const { type, paths } = event;
    if (get(type, 'create')) {
      callbacks.onCreate?.(get(type, 'create.kind'), paths);
    }
  }
}

export class RemoveEventStrategy implements WatchEventStrategy {
  handle(event: WatchEvent, callbacks: Partial<WatchCallbacks>): void {
    const { type, paths } = event;
    if (get(type, 'remove')) {
      callbacks.onRemove?.(get(type, 'remove.kind'), paths);
    }
  }
}

export class RenameEventStrategy implements WatchEventStrategy {
  handle(event: WatchEvent, callbacks: Partial<WatchCallbacks>): void {
    const { type, paths } = event;
    if (get(type, 'modify.kind') === 'rename' && get(type, 'modify.mode') === 'both') {
      callbacks.onRename?.(paths[0], paths[1]);
    }
  }
}

export class MoveEventStrategy implements WatchEventStrategy {
  handle(event: WatchEvent, callbacks: Partial<WatchCallbacks>): void {
    const { type, paths } = event;
    if (get(type, 'modify.kind') === 'rename' && get(type, 'modify.mode') === 'any') {
      callbacks.onMove?.(paths[0]);
    }
  }
}
// export class ModifyContentEventStrategy implements WatchEventStrategy {
//   handle(event: WatchEvent, callbacks: Partial<WatchCallbacks>): void {
//     const { type, paths } = event;
//     if (
//       get(type, "modify.kind") === "content" ||
//       (get(type, "modify.kind") !== "rename" && get(type, "modify"))
//     ) {
//       callbacks.onModify?.(paths);
//     }
//   }
// }

export class WatchEventContext {
  private strategies: WatchEventStrategy[] = [];

  constructor() {
    this.strategies.push(new CreateEventStrategy());
    this.strategies.push(new RemoveEventStrategy());
    this.strategies.push(new RenameEventStrategy());
    this.strategies.push(new MoveEventStrategy());
    // this.strategies.push(new ModifyContentEventStrategy());
  }

  executeStrategies(event: WatchEvent, callbacks: Partial<WatchCallbacks>): void {
    for (const strategy of this.strategies) {
      strategy.handle(event, callbacks);
    }
  }

  addStrategy(strategy: WatchEventStrategy): void {
    this.strategies.push(strategy);
  }
}

export const watchFolder = async (
  path: string,
  callbacks: Partial<WatchCallbacks>,
): Promise<UnwatchFn> => {
  const context = new WatchEventContext();

  return watch(
    path,
    async (event) => {
      console.log('event', event);
      // context.executeStrategies(event as WatchEvent, callbacks);
    },
    { delayMs: 1000, recursive: true },
  );
};
