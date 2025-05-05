import { Menu } from '@tauri-apps/api/menu';
import { TrayIcon, TrayIconOptions } from '@tauri-apps/api/tray';
import { defaultWindowIcon } from '@tauri-apps/api/app';
import { t } from '../i18n';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { isProd } from '.';

declare global {
  interface Window {
    __TRAY_INSTANCE?: TrayIcon;
  }
}

export async function createTrayMenu() {
  const menu = await Menu.new({
    items: [
      {
        id: 'quit',
        text: t('quit'),
      },
    ],
  });
  return menu;
}

export async function initTray() {
  if (getCurrentWebviewWindow().label !== 'main' || window.__TRAY_INSTANCE) return;

  const menu = await createTrayMenu();

  const options: TrayIconOptions = {
    icon: await defaultWindowIcon(),
    iconAsTemplate: true,
    menu,
    menuOnLeftClick: false,
    action: async (event) => {
      switch (event.type) {
        case 'Click':
          if (event.button === 'Right') return;
          await getCurrentWindow().show();
          await getCurrentWindow().setFocus();
          break;
      }
    },
  };

  const tray = await TrayIcon.new(options);
  window.__TRAY_INSTANCE = tray;
}

if (isProd) {
  initTray();
}
