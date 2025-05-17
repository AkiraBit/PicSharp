import { check } from '@tauri-apps/plugin-updater';
import { WebviewWindow, getAllWebviewWindows } from '@tauri-apps/api/webviewWindow';
import { t } from '../i18n';

export const UPDATE_WINDOW_LABEL = 'update-detail';

export const showUpdateWindow = async (newVersion: string, releaseContent: string) => {
  const windows = await getAllWebviewWindows();
  const target = windows.find((w) => w.label === UPDATE_WINDOW_LABEL);
  if (target) {
    target.show();
  } else {
    const win = new WebviewWindow(UPDATE_WINDOW_LABEL, {
      url: `/update?version=${newVersion}&releaseContent=${releaseContent}`,
      title: t('nav.update'),
      width: 500,
      height: 490,
      center: true,
      resizable: false,
      titleBarStyle: 'overlay',
      hiddenTitle: true,
      dragDropEnabled: true,
      minimizable: false,
      maximizable: false,
    });
    win.once('tauri://created', () => {
      console.log('new window created');
    });
    win.once('tauri://error', (e) => {
      console.error('error creating window', e);
    });
  }
};

export default async function checkForUpdate() {
  const updater = await check();
  if (updater) {
    console.log(`found update ${updater.version} from ${updater.date} with notes ${updater.body}`);
    showUpdateWindow(updater.version, updater.body);
    return updater;
  } else {
    return null;
  }
}
