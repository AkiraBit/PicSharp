import { sendNotification } from '@tauri-apps/plugin-notification';

export const sendTextNotification = (title: string, body: string) => {
  sendNotification({ title, body });
};
