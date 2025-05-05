import { invoke } from '@tauri-apps/api/core';

export function calImageWindowSize(imgWidth: number, imgHeight: number): [number, number] {
  const maxWidth = 1000.0;
  const maxHeight = 750.0;
  const minWidth = 400.0;
  const minHeight = 400.0;

  // 计算缩放因子
  const scaleWidth = maxWidth / imgWidth;
  const scaleHeight = maxHeight / imgHeight;
  const scale = Math.min(Math.min(scaleWidth, scaleHeight), 1.0);

  let width = Math.max(imgWidth * scale, minWidth);
  let height = Math.max(imgHeight * scale, minHeight) + 60;

  return [width, height];
}

export interface WindowConfig {
  label?: string;
  title?: string;
  width?: number;
  height?: number;
  resizable?: boolean;
  hiddenTitle?: boolean;
  minWidth?: number;
  minHeight?: number;
  maximizable?: boolean;
  minimizable?: boolean;
}

export async function spawnWindow(
  payload: Record<string, any> = {},
  windowConfig: WindowConfig = {},
): Promise<boolean> {
  return invoke('ipc_spawn_window', {
    launchPayload: JSON.stringify(payload),
    windowConfig,
  });
}
