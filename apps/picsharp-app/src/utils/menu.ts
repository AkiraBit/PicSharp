import { platform } from '@tauri-apps/plugin-os';
import { Menu, Submenu, PredefinedMenuItem, MenuItem } from '@tauri-apps/api/menu';
import { t } from '@/i18n';
import { relaunch } from '@tauri-apps/plugin-process';
import useAppStore from '@/store/app';
import { createWebviewWindow } from './window';
import checkForUpdate from './updater';
import { message } from '@tauri-apps/plugin-dialog';
import { open } from '@tauri-apps/plugin-shell';

export async function initAppMenu() {
  const appSubmenu = await Submenu.new({
    text: 'PicSharp',
    items: [
      await PredefinedMenuItem.new({
        text: t('menu.about'),
        item: {
          About: {
            name: 'PicSharp',
            comments: 'PicSharp111',
          },
        },
      }),
      await PredefinedMenuItem.new({
        item: 'Separator',
      }),
      await MenuItem.new({
        text: t('menu.settings'),
        action: () => {
          createWebviewWindow('settings', {
            url: '/settings',
            title: t('nav.settings'),
            width: 796,
            height: 528,
            center: true,
            resizable: true,
            titleBarStyle: 'overlay',
            hiddenTitle: true,
            dragDropEnabled: true,
            minimizable: true,
            maximizable: true,
          });
        },
        accelerator: 'CmdOrCtrl+,',
      }),
      await MenuItem.new({
        text: t('menu.check_update'),
        action: async () => {
          const updater = await checkForUpdate();
          if (!updater) {
            message(t('settings.about.version.no_update_available'), {
              title: t('tray.check_update'),
            });
          }
        },
        // accelerator: 'CmdOrCtrl+U',
      }),
      // await MenuItem.new({
      //   text: t('menu.relaunch'),
      //   action: async () => {
      //     await useAppStore.getState().destroySidecar();
      //     relaunch();
      //   },
      //   accelerator: 'CmdOrCtrl+R',
      // }),
      await PredefinedMenuItem.new({
        item: 'Separator',
      }),
      await PredefinedMenuItem.new({
        text: t('menu.hide'),
        item: 'Hide',
      }),
      await PredefinedMenuItem.new({
        text: t('menu.hide_others'),
        item: 'HideOthers',
      }),
      await PredefinedMenuItem.new({
        text: t('menu.show_all'),
        item: 'ShowAll',
      }),
      await PredefinedMenuItem.new({
        item: 'Separator',
      }),
      await PredefinedMenuItem.new({
        text: t('menu.services'),
        item: 'Services',
      }),
      await PredefinedMenuItem.new({
        item: 'Separator',
      }),
      await PredefinedMenuItem.new({
        text: t('menu.exit'),
        item: 'Quit',
      }),
    ],
  });

  const helpSubmenu = await Submenu.new({
    text: t('menu.help'),
    items: [
      await MenuItem.new({
        text: t('menu.report_issue'),
        action: () => {
          open('https://github.com/AkiraBit/PicSharp/issues');
        },
      }),
      await PredefinedMenuItem.new({
        item: 'Separator',
      }),
      await MenuItem.new({
        text: t('menu.star_on_github'),
        action: () => {
          open('https://github.com/AkiraBit/PicSharp');
        },
      }),
    ],
  });

  const editSubmenu = await Submenu.new({
    text: t('menu.edit'),
    items: [
      await PredefinedMenuItem.new({
        text: t('menu.edit.undo'),
        item: 'Undo',
      }),
      await PredefinedMenuItem.new({
        text: t('menu.edit.redo'),
        item: 'Redo',
      }),
      await PredefinedMenuItem.new({
        item: 'Separator',
      }),
      await PredefinedMenuItem.new({
        text: t('menu.edit.cut'),
        item: 'Cut',
      }),
      await PredefinedMenuItem.new({
        text: t('menu.edit.copy'),
        item: 'Copy',
      }),
      await PredefinedMenuItem.new({
        text: t('menu.edit.paste'),
        item: 'Paste',
      }),
      await PredefinedMenuItem.new({
        text: t('menu.edit.select_all'),
        item: 'SelectAll',
      }),
    ],
  });

  // const fileSubmenu = await Submenu.new({
  //   text: t('menu.file'),
  //   items: [
  //     await PredefinedMenuItem.new({
  //       text: t('menu.edit.undo'),
  //       item: 'Undo',
  //     }),
  //     await PredefinedMenuItem.new({
  //       text: t('menu.edit.redo'),
  //       item: 'Redo',
  //     }),
  //     await PredefinedMenuItem.new({
  //       item: 'Separator',
  //     }),
  //     await PredefinedMenuItem.new({
  //       text: t('menu.edit.cut'),
  //       item: 'Cut',
  //     }),
  //     await PredefinedMenuItem.new({
  //       text: t('menu.edit.copy'),
  //       item: 'Copy',
  //     }),
  //     await PredefinedMenuItem.new({
  //       text: t('menu.edit.paste'),
  //       item: 'Paste',
  //     }),
  //     await PredefinedMenuItem.new({
  //       text: t('menu.edit.select_all'),
  //       item: 'SelectAll',
  //     }),
  //   ],
  // });

  const defaultMenu = await Menu.default();
  const defaultMenuitems = await defaultMenu.items();
  const windowSubmenu = defaultMenuitems[defaultMenuitems.length - 2];
  await windowSubmenu.setText(t('menu.window'));
  const viewSubmenu = defaultMenuitems[defaultMenuitems.length - 3];
  await viewSubmenu.setText(t('menu.view'));

  const menu = await Menu.new({
    items: [appSubmenu, editSubmenu, windowSubmenu, viewSubmenu, helpSubmenu],
  });

  if (platform() === 'macos') {
    await menu.setAsAppMenu();
  }
}
