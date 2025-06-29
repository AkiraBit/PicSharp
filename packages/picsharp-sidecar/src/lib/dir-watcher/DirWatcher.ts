import { EventEmitter } from 'node:events';
import { parse, join } from 'node:path';
import { watch, watchFile, unwatchFile, FSWatcher } from 'node:fs';
import type { Stats, StatWatcher } from 'node:fs';
import { Trie, TrieNode } from './Trie';
import readdirp, { ReaddirpOptions, EntryInfo } from 'readdirp';
import { EventType, DirWatcherEventMap, TrieNodeData } from './types';
import { exists, hashFile } from './utils';
import { throttle } from 'radash';

export interface DirWatcherOptions {
  ignored?: (path: string) => boolean;
  directoryFilter?: ReaddirpOptions['directoryFilter'];
  fileFilter?: ReaddirpOptions['fileFilter'];
  depth?: ReaddirpOptions['depth'];
}

let num = 0;

export class DirWatcher extends EventEmitter<DirWatcherEventMap> {
  // 当前监听的目录路径
  #path: string;
  // 文件系统快照
  #snapshot: Trie<TrieNodeData> = new Trie<TrieNodeData>();
  // 监听选项
  #options?: DirWatcherOptions;
  // 自监听器
  #selfWatcher: StatWatcher | null = null;
  // 文件系统监听器
  #watcher: FSWatcher | null = null;
  // 节流器
  #throttledEmitters: Map<string, Function> = new Map();
  // 节流时间
  #throttleMs: number = 1000;
  // 循环队列
  #checkQueue: Map<string, Set<string>> = new Map();
  // 循环队列锁
  #checkLock: boolean = false;
  // 是否已关闭
  public closed: boolean = false;

  constructor(path: string, options?: DirWatcherOptions) {
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

  #setNodeHash = async (node: TrieNode<TrieNodeData>, path: string) => {
    const hash = await hashFile(path);
    node.hash = hash;
  };

  #createSnapshot = async (path: string, options?: Partial<ReaddirpOptions>) => {
    return new Promise<Trie<TrieNodeData>>((resolve, reject) => {
      const snapshot = new Trie<TrieNodeData>();
      const queue: Array<Promise<void>> = [];
      snapshot.add(path, true);
      readdirp(path, options)
        .on('data', (entry: EntryInfo) => {
          const { fullPath, stats } = entry;
          if (stats?.isDirectory()) {
            snapshot.add(fullPath, true);
          } else {
            const { dir, name, ext, base } = parse(fullPath);
            const node = snapshot.add(fullPath, false, {
              fullPath,
              dir,
              name: base,
              basename: name,
              ext,
              stats: entry.stats,
            });
            queue.push(this.#setNodeHash(node, fullPath));
          }
        })
        .on('warn', (error) => {
          this.emit(EventType.WALK_WARN, error);
        })
        .on('error', (error) => {
          console.log('error', error);
          reject(error);
        })
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

  #watch = (path: string, options?: DirWatcherOptions) => {
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
    try {
      const newSnapshot = await this.#createSnapshot(dir, {
        depth: 1,
        type: 'files_directories',
        alwaysStat: true,
        fileFilter: this.#options?.fileFilter,
        directoryFilter: this.#options?.directoryFilter,
      });

      for (const path of paths) {
        const newNode = newSnapshot.getNode(path);
        const newParentNode = newSnapshot.getNode(dir);

        const oldNode = this.#snapshot.getNode(path);
        const oldParentNode = this.#snapshot.getNode(dir);

        // 判断是否新增
        if (newSnapshot.hasPath(path) && !this.#snapshot.hasPath(path)) {
          if (oldParentNode) {
            const targetNode = Array.from(oldParentNode.children!.values()).find((child) => {
              if (newNode?.isDirectory) {
                return child.isDirectory && child.data?.name === newNode?.data?.name;
              } else {
                return (
                  !child.isDirectory &&
                  child.hash === newNode?.hash &&
                  child.data?.name === newNode?.data?.name
                );
              }
            });
            if (!targetNode) {
              if (newNode?.isDirectory) {
                const newNodeSnapshot = await this.#createSnapshot(newNode?.fullPath, {
                  type: 'files_directories',
                  alwaysStat: true,
                  fileFilter: this.#options?.fileFilter,
                  directoryFilter: this.#options?.directoryFilter,
                });
                const newNodeData = newNodeSnapshot.getNode(path);
                this.#snapshot.add(
                  path,
                  newNode?.isDirectory || false,
                  newNodeData?.data,
                  newNodeData?.hash,
                  newNodeData?.children,
                );
                this.emit(EventType.ADD, {
                  fullPath: newNode?.fullPath,
                  isDirectory: true,
                });
              } else {
                this.#snapshot.add(
                  path,
                  newNode?.isDirectory || false,
                  newNode?.data,
                  newNode?.hash,
                );
                this.emit(EventType.ADD, {
                  ...newNode?.data!,
                  hash: newNode?.hash!,
                  isDirectory: false,
                });
              }
            }
          }
        } else if (!newSnapshot.hasPath(path) && this.#snapshot.hasPath(path)) {
          if (newParentNode) {
            const targetNode = Array.from(newParentNode.children!.values()).find((child) => {
              if (oldNode?.isDirectory) {
                return child.isDirectory && child.data?.name === oldNode?.data?.name;
              } else {
                return (
                  !child.isDirectory &&
                  child.hash === oldNode?.hash &&
                  child.data?.name === oldNode?.data?.name
                );
              }
            });
            if (targetNode) {
              if (oldNode?.isDirectory) {
                this.emit(
                  EventType.RENAME,
                  {
                    fullPath: oldNode?.fullPath,
                    isDirectory: true,
                  },
                  {
                    fullPath: targetNode?.fullPath,
                    isDirectory: true,
                  },
                );
              } else {
                this.emit(
                  EventType.RENAME,
                  {
                    ...oldNode?.data!,
                    hash: oldNode?.hash!,
                    isDirectory: false,
                  },
                  {
                    ...targetNode?.data!,
                    hash: targetNode?.hash!,
                    isDirectory: false,
                  },
                );
              }
            } else if (!(await exists(path))) {
              this.#snapshot.remove(path);
              this.emit(EventType.REMOVE, {
                ...oldNode?.data!,
                hash: oldNode?.hash!,
                isDirectory: !!oldNode?.isDirectory,
              });
            }
          }
        } else if (newSnapshot.hasPath(path) && this.#snapshot.hasPath(path)) {
          const newNode = newSnapshot.getNode(path);
          const oldNode = this.#snapshot.getNode(path);
          if (
            !newNode?.isDirectory &&
            !oldNode?.isDirectory &&
            newNode?.data?.stats?.mtimeMs !== oldNode?.data?.stats?.mtimeMs &&
            newNode?.data?.stats?.size !== oldNode?.data?.stats?.size
          ) {
            this.#snapshot.updateLeafNode(path, {
              name: newNode?.name ?? '',
              data: newNode?.data,
              hash: newNode?.hash,
            });
            this.emit(
              EventType.CHANGE,
              {
                ...oldNode?.data!,
                hash: oldNode?.hash!,
                isDirectory: !!oldNode?.isDirectory,
              },
              {
                ...newNode?.data!,
                hash: newNode?.hash!,
                isDirectory: !!newNode?.isDirectory,
              },
            );
          }
        }
      }
    } catch (error) {
      this.#errorHandler(error);
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
