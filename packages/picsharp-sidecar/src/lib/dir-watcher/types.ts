import type { WatchEventType, Stats } from 'node:fs';

/**
 * 事件类型
 */
export enum EventType {
  /**
   * 初始化完成，可以开始监听
   */
  READY = 'READY',
  /**
   * 监听器捕获的非致命错误
   */
  WALK_WARN = 'WALK_WARN',
  /**
   * 自监听器捕获的自身ENOENT错误，表示监听的目录不存在
   */
  SELF_ENOENT = 'SELF_ENOENT',
  /**
   * 来自fs.watch的原始事件
   */
  RAW = 'RAW',
  /**
   * 监听器捕获的错误
   */
  ERROR = 'ERROR',
  /**
   * 监听器关闭
   */
  CLOSE = 'CLOSE',
  /**
   * 添加文件
   */
  ADD = 'ADD',
  /**
   * 删除文件
   */
  REMOVE = 'REMOVE',
  /**
   * 修改文件
   */
  CHANGE = 'CHANGE',
  /**
   * 修改文件名
   */
  RENAME = 'RENAME',
}

export interface TrieNodeData {
  fullPath: string;
  dir?: string;
  name?: string;
  basename?: string;
  ext?: string;
  // 只有非目录节点有
  stats?: Stats;
}

export type EventPayload = TrieNodeData & {
  isDirectory: boolean;
  hash?: string;
};

export interface DirWatcherEventMap {
  [EventType.READY]: [];
  [EventType.WALK_WARN]: [Error];
  [EventType.SELF_ENOENT]: [];
  [EventType.CLOSE]: [];
  [EventType.RAW]: [WatchEventType, string];
  [EventType.ERROR]: [Error];
  [EventType.ADD]: [EventPayload];
  [EventType.REMOVE]: [EventPayload];
  [EventType.CHANGE]: [EventPayload, EventPayload];
  [EventType.RENAME]: [EventPayload, EventPayload];
}
