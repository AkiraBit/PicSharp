import { Menu } from '@tauri-apps/api/menu';
import { TrayIcon, TrayIconOptions } from '@tauri-apps/api/tray';
import { defaultWindowIcon } from '@tauri-apps/api/app';
import { t } from '../i18n';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { isProd } from '.';
import { createWebviewWindow } from './window';
import checkForUpdate from './updater';
import { message } from '@tauri-apps/plugin-dialog';

declare global {
  interface Window {
    __TRAY_INSTANCE?: TrayIcon;
  }
}

export async function createTrayMenu() {
  if (getCurrentWebviewWindow().label !== 'main') return;
  const menu = await Menu.new({
    items: [
      {
        id: 'open',
        text: t('tray.open'),
        action: async () => {
          await getCurrentWindow().show();
          await getCurrentWindow().setFocus();
        },
        accelerator: 'CmdOrCtrl+O',
      },
      {
        id: 'settings',
        text: t('tray.settings'),
        action: () => {
          createWebviewWindow('settings', {
            url: '/settings',
            title: t('nav.settings'),
            width: 724,
            height: 450,
            center: true,
            resizable: true,
            titleBarStyle: 'overlay',
            hiddenTitle: true,
            dragDropEnabled: true,
            minimizable: true,
            maximizable: true,
          });
        },
        accelerator: 'CmdOrCtrl+S',
      },
      {
        id: 'check_update',
        text: t('tray.check_update'),
        action: async () => {
          const updater = await checkForUpdate();
          if (!updater) {
            message(t('settings.about.version.no_update_available'), {
              title: t('tray.check_update'),
            });
          }
        },
        accelerator: 'CmdOrCtrl+U',
      },
      {
        id: 'quit',
        text: t('tray.quit'),
        action: () => {
          getCurrentWindow().destroy();
        },
        accelerator: 'CmdOrCtrl+Q',
      },
    ],
  });
  return menu;
}

export async function initTray() {
  if (getCurrentWebviewWindow().label !== 'main' || window.__TRAY_INSTANCE) return;

  const menu = await createTrayMenu();
  const icon = await defaultWindowIcon();
  const options: TrayIconOptions = {
    icon,
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
