import { create } from 'zustand';
import EventEmitter from 'eventemitter3';
import { isProd } from '@/utils';
import { Command, Child } from '@tauri-apps/plugin-shell';
import { info, error } from '@tauri-apps/plugin-log';
import { remove, BaseDirectory } from '@tauri-apps/plugin-fs';

interface AppState {
  eventEmitter: EventEmitter;
  sidecar: {
    spawning: boolean;
    process?: Child;
    origin: string;
  } | null;
}

interface AppAction {
  initSidecar: () => Promise<void>;
  pingSidecar: () => Promise<void>;
  destroySidecar: () => Promise<boolean>;
  clearImageCache: () => Promise<boolean>;
}

const useAppStore = create<AppState & AppAction>((set, get) => ({
  eventEmitter: new EventEmitter(),
  sidecar: null,
  initSidecar: async () => {
    try {
      get().destroySidecar();
      if (isProd) {
        const command = Command.sidecar('binaries/picsharp-sidecar');
        command.stdout.once('data', (data) => {
          const response = JSON.parse(data);
          set({
            sidecar: { ...(get().sidecar || ({} as AppState['sidecar'])), origin: response.origin },
          });
          console.log(`[Init Sidecar Success]: Server: ${response.origin}`);
          info(`[Init Sidecar Success]: Server: ${response.origin}`);
        });
        const process = await command.spawn();
        set({
          sidecar: { ...(get().sidecar || ({} as AppState['sidecar'])), process, spawning: true },
        });
        console.log(`[Init Sidecar Success]: PID ${process.pid}`);
        info(`[Init Sidecar Success]: PID ${process.pid}`);
      } else {
        set({ sidecar: { origin: 'http://localhost:3000', spawning: false } });
      }
    } catch (err) {
      console.error(`[Init Sidecar Error]: ${err.message || err.toString()}`);
      error(`[Init Sidecar Error]: ${err.message || err.toString()}`);
    }
  },
  pingSidecar: async () => {
    if (get().sidecar?.origin) {
      try {
        const response = await fetch(`${get().sidecar?.origin}/ping`);
        if (response.status !== 200) {
          throw new Error('sidecarHeartbeat error');
        }
        const text = await response.text();
        console.log(`[Sidecar Heartbeat]: ${text}`);
      } catch (err) {
        const errorMessage = `[Sidecar Heartbeat Error]: ${err.message || err.toString()}`;
        console.error(errorMessage);
        error(errorMessage);
        get().initSidecar();
      }
    }
  },
  destroySidecar: async () => {
    try {
      if (get().sidecar?.process) {
        await get().sidecar.process.kill();
      }
      set({ sidecar: null });
      return true;
    } catch (err) {
      console.error(`[Destroy Sidecar Error]: ${err.message || err.toString()}`);
      return false;
    }
  },
  clearImageCache: async () => {
    try {
      await remove('picsharp_temp', { baseDir: BaseDirectory.AppCache, recursive: true });
      info('[Clear Image Cache]: Success');
      return true;
    } catch (err) {
      console.error(`[Clear Image Cache Error]: ${err.message || err.toString()}`);
      error(`[Clear Image Cache Error]: ${err.message || err.toString()}`);
      return false;
    }
  },
}));

export default useAppStore;
