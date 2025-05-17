import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { message } from '@tauri-apps/plugin-dialog';
import { WebviewWindow, getAllWebviewWindows } from '@tauri-apps/api/webviewWindow';
import { t } from '../i18n';
import { toast } from 'sonner';

const UPDATE_WINDOW_LABEL = 'update-detail';

const showUpdateWindow = async (newVersion: string) => {
  const windows = await getAllWebviewWindows();
  const target = windows.find((w) => w.label === UPDATE_WINDOW_LABEL);
  if (target) {
    target.show();
  } else {
    const win = new WebviewWindow(UPDATE_WINDOW_LABEL, {
      url: `/update?version=${newVersion}`,
      title: t('nav.update'),
      width: 500,
      height: 490,
      center: true,
      resizable: false,
      theme: 'dark',
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
  const update = await check();
  console.log('update', update);
  if (update) {
    console.log(`found update ${update.version} from ${update.date} with notes ${update.body}`);
    showUpdateWindow(update.version);
    return true;
    // message(`found update ${update.version} from ${update.date} with notes ${update.body}`);
    // let downloaded = 0;
    // let contentLength = 0;
    // // alternatively we could also call update.download() and update.install() separately
    // await update.downloadAndInstall((event) => {
    //   switch (event.event) {
    //     case 'Started':
    //       contentLength = event.data.contentLength;
    //       console.log(`started downloading ${event.data.contentLength} bytes`);
    //       break;
    //     case 'Progress':
    //       downloaded += event.data.chunkLength;
    //       console.log(`downloaded ${downloaded} from ${contentLength}`);
    //       break;
    //     case 'Finished':
    //       console.log('download finished');
    //       break;
    //   }
    // });

    // console.log('update installed');
    // await relaunch();
  } else {
    toast.success(t('settings.about.version.no_update_available'), {
      richColors: true,
    });
    return false;
  }
}
