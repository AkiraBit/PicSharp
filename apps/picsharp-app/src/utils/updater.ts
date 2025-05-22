import { check } from '@tauri-apps/plugin-updater';
import { createWebviewWindow } from './window';
import { t } from '../i18n';

export const UPDATE_WINDOW_LABEL = 'update-detail';

export default async function checkForUpdate() {
  const updater = await check();
  if (updater) {
    console.log(`found update ${updater.version} from ${updater.date} with notes ${updater.body}`);
    createWebviewWindow(UPDATE_WINDOW_LABEL, {
      url: `/update?version=${updater.version}&releaseContent=${updater.body}`,
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
    return updater;
  } else {
    return null;
  }
}
