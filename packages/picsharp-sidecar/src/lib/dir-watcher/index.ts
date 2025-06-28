import { stat } from 'node:fs/promises';
import { hasPermission, exists } from './utils';
import { DirWatcher, DirWatcherOptions } from './DirWatcher';

export async function watch(path: string, options?: DirWatcherOptions) {
  if (!(await exists(path))) {
    throw new Error(`Path <${path}> does not exist`);
  } else if (!hasPermission(path)) {
    throw new Error(`Path <${path}> is not accessible`);
  }
  const stats = await stat(path);
  if (!stats.isDirectory()) {
    throw new Error(`Path <${path}> is not a directory`);
  }
  const watcher = new DirWatcher(path, options);
  return watcher;
}

export * from './types';
