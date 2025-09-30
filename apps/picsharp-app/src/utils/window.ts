import { invoke } from '@tauri-apps/api/core';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { t } from '@/i18n';
import { isMac } from '.';
import { message } from '@/components/message';
import { report } from '.';

export const windowFocus = async (target?: WebviewWindow) => {
  const window = target || WebviewWindow.getCurrent();
  if (window) {
    await window.show();
    await window.setFocus();
  }
};

export function calImageWindowSize(imgWidth: number, imgHeight: number): [number, number] {
  const maxWidth = 1000.0;
  const maxHeight = 750.0;
  const minWidth = 400.0;
  const minHeight = 400.0;

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
  theme?: string;
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

const commonWindowConfig = {
  resizable: true,
  center: true,
};

const macosWindowConfig = {
  titleBarStyle: 'overlay',
  hiddenTitle: true,
  theme: 'dark',
};

const unmacosWindowConfig = {
  decorations: false,
};

const platformConfig = isMac ? macosWindowConfig : unmacosWindowConfig;

export async function createWebviewWindow(
  label: string,
  options: ConstructorParameters<typeof WebviewWindow>[1],
) {
  const target = await WebviewWindow.getByLabel(label);
  console.log(`[createWebviewWindow] ${label}`, target);
  if (target) {
    windowFocus(target);
    return target;
  } else {
    return new WebviewWindow(label, {
      ...commonWindowConfig,
      ...(platformConfig as any),
      ...options,
    });
  }
}

export async function openSettingsWindow(
  options: { subpath?: string; query?: Record<string, string>; hash?: string } = {},
) {
  createWebviewWindow('picsharp_settings', {
    url: `/settings${options.subpath ? `/${options.subpath}` : ''}${options.query ? `?${new URLSearchParams(options.query).toString()}` : ''}${options.hash ? `#${options.hash}` : ''}`,
    title: t('nav.settings'),
    width: 796,
    height: 528,
    minWidth: 796,
    minHeight: 529,
  }).catch((err) => {
    report('open_settings_window_failed', {
      error: err.message,
    });
    message.error(t('tips.open_settings_window_failed'));
  });
}
