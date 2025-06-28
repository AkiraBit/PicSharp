import { EventEmitter } from 'node:events';
import { parse, join } from 'node:path';
import { watch, watchFile, unwatchFile, FSWatcher } from 'node:fs';
import type { Stats, StatWatcher } from 'node:fs';
import { Trie, TrieNode } from './Trie';
import readdirp, { ReaddirpOptions, EntryInfo } from 'readdirp';
import { EventType, FsDirWatcherEventMap } from './types';
import { exists, hashFile } from './utils';
import { throttle } from 'radash';

export interface FsDirWatcherOptions {
  ignored?: (path: string) => boolean;
  directoryFilter?: ReaddirpOptions['directoryFilter'];
  fileFilter?: ReaddirpOptions['fileFilter'];
  depth?: ReaddirpOptions['depth'];
}

export class FsDirWatcher extends EventEmitter<FsDirWatcherEventMap> {
  // 当前监听的目录路径
  #path: string;
  // 文件系统快照
  #snapshot: Trie<Stats> = new Trie<Stats>();
  // 监听选项
  #options?: FsDirWatcherOptions;
  // 自监听器
  #selfWatcher: StatWatcher | null = null;
  // 文件系统监听器
  #watcher: FSWatcher | null = null;
  // 节流器
  #throttledEmitters: Map<string, Function> = new Map();
  // 节流时间
  #throttleMs: number = 500;
  // 循环队列
  #checkQueue: Map<string, Set<string>> = new Map();
  // 循环队列锁
  #checkLock: boolean = false;
  // 是否已关闭
  public closed: boolean = false;

  constructor(path: string, options?: FsDirWatcherOptions) {
    super();
    this.#path = path;
    this.#options = options;
    this.#init();
  }

  #init = async () => {
    try {
      this.#snapshot = await this.#createSnapshot(this.#path, {
        fileFilter: this.#options?.fileFilter,
        directoryFilter: this.#options?.directoryFilter,
        depth: this.#options?.depth,
        type: 'files_directories',
        alwaysStat: true,
      });
      this.#selfWatch();
      this.#watch(this.#path, this.#options);
      this.emit(EventType.READY);
    } catch (error) {
      this.#errorHandler(error);
    }
  };

  #setNodeHash = async (node: TrieNode<Stats>, path: string) => {
    const hash = await hashFile(path);
    node.hash = hash;
  };

  #createSnapshot = async (path: string, options?: Partial<ReaddirpOptions>) => {
    return new Promise<Trie<Stats>>((resolve, reject) => {
      const snapshot = new Trie<Stats>();
      const queue: Array<Promise<void>> = [];
      readdirp(path, options)
        .on('data', (entry: EntryInfo) => {
          const { fullPath, stats } = entry;
          if (stats?.isDirectory()) {
            snapshot.add(fullPath, true);
          } else {
            const node = snapshot.add(fullPath, false, stats);
            queue.push(this.#setNodeHash(node, fullPath));
          }
        })
        .on('warn', (error) => {
          this.emit(EventType.WALK_WARN, error);
        })
        .on('error', reject)
        .on('end', async () => {
          await Promise.all(queue);
          resolve(snapshot);
        });
    });
  };

  /**
   * 自监听器，用于监听被删除的情况
   */
  #selfWatch = () => {
    this.#selfWatcher = watchFile(this.#path, { persistent: true, interval: 1000 }, (curr) => {
      if (
        Object.values(curr).every((value) => {
          if (typeof value === 'number') {
            return value === 0;
          } else if (value instanceof Date) {
            return value.getTime() === 0;
          }
          return false;
        })
      ) {
        this.emit(EventType.SELF_ENOENT);
        this.close();
      }
    });
  };

  #watch = (path: string, options?: FsDirWatcherOptions) => {
    this.#watcher = watch(path, { recursive: true, persistent: true }, (eventType, filename) => {
      if (!filename) return;
      this.emit(EventType.RAW, eventType, filename);
      // Todo 添加自定义文件过滤器
      const fullPath = join(path, filename);
      const { dir } = parse(fullPath);

      if (!this.#throttledEmitters.has(fullPath)) {
        const throttledEmitter = throttle({ interval: this.#throttleMs }, () => {
          if (!this.#checkQueue.has(dir)) {
            this.#checkQueue.set(dir, new Set([fullPath]));
          } else {
            this.#checkQueue.get(dir)!.add(fullPath);
          }

          if (!this.#checkLock) {
            this.#checkLock = true;
            setImmediate(this.#checkHandler);
          }
        });
        this.#throttledEmitters.set(fullPath, throttledEmitter);
      }

      const throttledEmitter = this.#throttledEmitters.get(fullPath)!;
      throttledEmitter(fullPath);
    });
  };

  #checkHandler = () => {
    this.#checkLock = false;
    for (const [dir, paths] of this.#checkQueue) {
      this.#diffHandler(dir, paths);
      this.#checkQueue.delete(dir);
    }
    this.#checkQueue.clear();
  };

  #diffHandler = async (dir: string, paths: Set<string>) => {
    const newSnapshot = await this.#createSnapshot(dir, {
      depth: 1,
      type: 'files_directories',
      alwaysStat: true,
      fileFilter: this.#options?.fileFilter,
      directoryFilter: this.#options?.directoryFilter,
    });

    for (const path of paths) {
      // 新节点树
      const newNode = newSnapshot.getNode(path);
      const newParentNode = newSnapshot.getNode(dir);
      // 旧节点树
      const oldNode = this.#snapshot.getNode(path);
      const oldParentNode = this.#snapshot.getNode(dir);
      // console.log("oldParentNode", oldParentNode.name);
      // 判断是否新增
      if (newSnapshot.hasPath(path) && !this.#snapshot.hasPath(path)) {
        if (oldParentNode) {
          const targetNode = [...oldParentNode.children!.values()]
            .filter((i) => !i.isDirectory && i.hash)
            .find((child) => {
              return child.hash === newNode?.hash;
            });
          if (!targetNode) {
            this.#snapshot.add(path, newNode?.isDirectory ?? false, newNode?.data);
            this.emit(EventType.ADD, path);
          }
        }
      } else if (!newSnapshot.hasPath(path) && this.#snapshot.hasPath(path)) {
        if (newParentNode) {
          const targetNode = [...newParentNode.children!.values()]
            .filter((i) => !i.isDirectory && i.hash)
            .find((child) => {
              return child.hash === oldNode?.hash;
            });
          if (targetNode) {
            this.emit(EventType.RENAME, oldNode?.name ?? '', targetNode?.name ?? '');
          } else if (!(await exists(path))) {
            this.#snapshot.remove(path);
            this.emit(EventType.REMOVE, path);
          }
        }
      } else if (newSnapshot.hasPath(path) && this.#snapshot.hasPath(path)) {
        const newNode = newSnapshot.getNode(path);
        const oldNode = this.#snapshot.getNode(path);
        if (
          !newNode?.isDirectory &&
          !oldNode?.isDirectory &&
          newNode?.data?.mtimeMs !== oldNode?.data?.mtimeMs &&
          newNode?.data?.size !== oldNode?.data?.size
        ) {
          this.#snapshot.updateLeafNode(path, {
            name: newNode?.name ?? '',
            data: newNode?.data,
            hash: newNode?.hash,
          });
          this.emit(EventType.CHANGE, path, newNode?.data ?? {}, oldNode?.data ?? {});
        }
      }
    }
  };

  /**
   * 错误处理
   */
  #errorHandler = (error: unknown) => {
    this.emit(EventType.ERROR, error instanceof Error ? error : new Error(error?.toString() ?? ''));
  };

  /**
   * 关闭并销毁监听器，释放所有资源
   */
  public close = () => {
    if (this.closed) return;
    this.closed = true;
    this.#selfWatcher?.unref();
    unwatchFile(this.#path);
    this.#watcher?.close();
    this.#throttledEmitters.clear();
    this.emit(EventType.CLOSE);
  };
}
