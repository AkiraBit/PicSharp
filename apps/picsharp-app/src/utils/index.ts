import { platform } from '@tauri-apps/plugin-os';
export const validTinifyExts = [
  'png',
  'jpg',
  'jpeg',
  'jpeg',
  'webp',
  'avif',
  'gif',
  'svg',
  'tiff',
  'tif',
];

export function isAvailableTinifyExt(ext: string) {
  return validTinifyExts.includes(ext);
}

export function isAvailableImageExt(ext: string) {
  return isAvailableTinifyExt(ext);
}

export function isValidArray(arr: unknown) {
  return Array.isArray(arr) && arr.length > 0;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function preventDefault(event) {
  event.preventDefault();
}

export function stopPropagation(event) {
  event.stopPropagation();
}

export const isDev = import.meta.env.DEV;

export const isProd = import.meta.env.PROD;

export const isMac = platform() === 'macos';
export const isWindows = platform() === 'windows';
export const isLinux = platform() === 'linux';

export const getUserLocale = (lang: string): string | undefined => {
  const languages =
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];

  const filteredLocales = languages.filter((locale) => locale.startsWith(lang));
  return filteredLocales.length > 0 ? filteredLocales[0] : undefined;
};

export const getOSPlatform = () => {
  const userAgent = navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
  if (userAgent.includes('android')) return 'android';
  if (userAgent.includes('macintosh') || userAgent.includes('mac os x')) return 'macos';
  if (userAgent.includes('windows nt')) return 'windows';
  if (userAgent.includes('linux')) return 'linux';

  return '';
};

export async function uint8ArrayToRGBA(
  uint8Array: Uint8Array,
  mimeType: string,
): Promise<{
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
}> {
  const blob = new Blob([uint8Array.buffer], { type: mimeType });
  const imageBitmap = await createImageBitmap(blob);

  const canvas = document.createElement('canvas');
  canvas.width = imageBitmap.width;
  canvas.height = imageBitmap.height;

  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(imageBitmap, 0, 0);

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  return {
    rgba: data,
    width: canvas.width,
    height: canvas.height,
  };
}

export function correctFloat(value: number, precision = 12) {
  return parseFloat(value.toPrecision(precision));
}

export function calProgress(current: number, total: number) {
  return correctFloat(Number((current / total).toFixed(2)) * 100);
}
