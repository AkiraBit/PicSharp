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

// export async function uint8ArrayToRGBA(
//   uint8Array: Uint8Array,
//   mimeType: string,
// ): Promise<{
//   rgba: Uint8ClampedArray;
//   width: number;
//   height: number;
// }> {
//   const blob = new Blob([uint8Array.buffer], { type: mimeType });
//   const imageBitmap = await createImageBitmap(blob);

//   const canvas = document.createElement('canvas');
//   canvas.width = imageBitmap.width;
//   canvas.height = imageBitmap.height;

//   const ctx = canvas.getContext('2d')!;
//   ctx.drawImage(imageBitmap, 0, 0);

//   const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

//   return {
//     rgba: data,
//     width: canvas.width,
//     height: canvas.height,
//   };
// }

export function correctFloat(value: number, precision = 12) {
  return parseFloat(value.toPrecision(precision));
}

export function calProgress(current: number, total: number) {
  return correctFloat(Number((current / total).toFixed(2)) * 100);
}

/**
 * 将SSIM（结构相似性）值映射到一个更符合人类感知的、非线性的“画质保留率”分数。
 *
 * SSIM本身是一个在[0, 1]区间的技术指标，它与人类对图像质量的感知并非线性关系。
 * 此函数通过一个分段指数函数，将SSIM值“翻译”成一个在[0, 100]区间的、更直观的分数。
 *
 * 映射逻辑：
 * - 在高质量区间 (SSIM > 0.95)，分数变化更敏感，以反映微小差异。
 * - 在中等质量区间，分数变化相对平缓。
 * - 在低质量区间 (SSIM < 0.90)，分数会加速下降，以反映图像质量的显著劣化。
 *
 * @param ssimValue - 输入的SSIM值，通常在0和1之间。
 * @returns 返回一个0到100之间的画质保留率分数。
 */
export function ssimToQualityScore(ssimValue: number): number {
  // 1. 输入校验与边界处理：确保ssimValue在[0, 1]闭区间内
  const clampedSsim = Math.max(0, Math.min(1, ssimValue));

  let qualityScore: number;

  // 2. 分段映射逻辑
  if (clampedSsim >= 0.99) {
    // [0.99, 1.0] -> [99, 100]
    // 在这个顶级的区间，我们使用线性映射，因为差异已经极小。
    // 每增加0.01的SSIM，分数增加1分。
    qualityScore = 99.0 + (clampedSsim - 0.99) * 100;
  } else if (clampedSsim >= 0.95) {
    // [0.95, 0.99) -> [95, 99)
    // 这是一个高质量区间，我们希望拉伸这个区间以放大差异。
    // 使用一个小于1的指数，使曲线向上弯曲。
    const power = 0.6;
    const base = (clampedSsim - 0.95) / 0.04; // 将区间归一化到[0, 1)
    qualityScore = 95.0 + 4.0 * Math.pow(base, power);
  } else if (clampedSsim >= 0.9) {
    // [0.90, 0.95) -> [90, 95)
    // 中等质量区间，使用稍缓和的曲线。
    const power = 0.8;
    const base = (clampedSsim - 0.9) / 0.05; // 归一化
    qualityScore = 90.0 + 5.0 * Math.pow(base, power);
  } else {
    // [0, 0.90) -> [0, 90)
    // 低质量区间，我们希望分数加速下降。
    // 使用一个大于1的指数，使曲线向下弯曲。
    const power = 1.5;
    const base = clampedSsim / 0.9; // 归一化
    qualityScore = 90.0 * Math.pow(base, power);
  }

  // 3. 返回最终结果，并确保结果不会因浮点数精度问题超过100
  return Math.min(100, qualityScore);
}
