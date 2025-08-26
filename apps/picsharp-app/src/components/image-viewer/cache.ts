export interface ImageCacheOptions {
  maxEntries: number;
}

export interface ImageThumbnailCacheRecord {
  key: string;
  width: number;
  height: number;
  outputPath: string;
  updatedAt: number;
}

const DEFAULT_OPTIONS: ImageCacheOptions = {
  maxEntries: 1000,
};

let runtimeOptions: ImageCacheOptions = { ...DEFAULT_OPTIONS };

export function setImageViewerCacheOptions(options: Partial<ImageCacheOptions>): void {
  runtimeOptions = { ...runtimeOptions, ...options };
}

export function getImageViewerCacheOptions(): ImageCacheOptions {
  return { ...runtimeOptions };
}

export function getImageViewerCacheKey(path: string, width: number, height: number): string {
  return `${path}|${width}x${height}`;
}

const lruCache = new Map<string, ImageThumbnailCacheRecord>();

function touchEntry(key: string) {
  const existing = lruCache.get(key);
  if (!existing) return;
  lruCache.delete(key);
  lruCache.set(key, { ...existing, updatedAt: Date.now() });
}

export function readCache(key: string): ImageThumbnailCacheRecord | null {
  const value = lruCache.get(key) || null;
  if (value) {
    touchEntry(key);
  }
  return value;
}

export function putCache(value: ImageThumbnailCacheRecord): void {
  if (lruCache.has(value.key)) {
    lruCache.delete(value.key);
  }
  lruCache.set(value.key, value);
  enforceLimit();
}

function enforceLimit() {
  const maxEntries = Math.max(1, runtimeOptions.maxEntries || DEFAULT_OPTIONS.maxEntries);
  while (lruCache.size > maxEntries) {
    const firstKey = lruCache.keys().next().value as string | undefined;
    if (!firstKey) break;
    lruCache.delete(firstKey);
  }
}

export function deleteImageViewerCacheByKey(key: string): void {
  lruCache.delete(key);
}

export async function clearImageViewerCache(): Promise<void> {
  lruCache.clear();
}

export type ImageViewerCacheOptions = ImageCacheOptions;
export type ThumbnailCacheValue = ImageThumbnailCacheRecord;
