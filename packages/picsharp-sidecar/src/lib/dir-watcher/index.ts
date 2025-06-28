import { stat } from "node:fs/promises";
import { hasPermission, exists } from "./utils";
import { FsDirWatcher, FsDirWatcherOptions } from "./DirWatcher";

export async function watch(path: string, options?: FsDirWatcherOptions) {
	if (!(await exists(path))) {
		throw new Error(`Path <${path}> does not exist`);
	} else if (!hasPermission(path)) {
		throw new Error(`Path <${path}> is not accessible`);
	}
	const stats = await stat(path);
	if (!stats.isDirectory()) {
		throw new Error(`Path <${path}> is not a directory`);
	}
	const watcher = new FsDirWatcher(path, options);
	return watcher;
}

export * from "./types";
