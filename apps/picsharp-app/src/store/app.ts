import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import EventEmitter from 'eventemitter3';
import { isProd } from '@/utils';
import { Command, Child } from '@tauri-apps/plugin-shell';
import { info, error } from '@tauri-apps/plugin-log';
import { exists, remove, mkdir } from '@tauri-apps/plugin-fs';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { withStorageDOMEvents } from './withStorageDOMEvents';
import { isFunction } from 'radash';
import { appCacheDir, appDataDir, appLogDir, join } from '@tauri-apps/api/path';
import { toast } from '@/components/sidecar-error-toast';
interface AppState {
  eventEmitter: EventEmitter;
  sidecar: {
    spawning: boolean;
    process?: Child;
    origin: string;
  } | null;
  imageTempDir: string;
  cacheDir: string;
  logDir: string;
  dataDir: string;
}

interface AppAction {
  initSidecar: () => Promise<void>;
  pingSidecar: () => Promise<void>;
  destroySidecar: () => Promise<boolean>;
  initAppPath: () => Promise<void>;
  clearImageCache: () => Promise<boolean>;
}

type AppStore = AppState & AppAction;

const useAppStore = create(
  persist<AppStore>(
    (set, get) => ({
      eventEmitter: new EventEmitter(),
      sidecar: null,
      imageTempDir: '',
      cacheDir: '',
      logDir: '',
      dataDir: '',
      initSidecar: async () => {
        try {
          get().destroySidecar();
          if (getCurrentWebviewWindow().label === 'main') {
            if (isProd) {
              const command = Command.sidecar('binaries/picsharp-sidecar', '', {
                env: {
                  PICSHARP_SIDECAR_ENABLE: 'true',
                  PICSHARP_SIDECAR_CLUSTER: 'true',
                  PICSHARP_SIDECAR_MODE: 'server',
                  PICSHARP_SIDECAR_STORE: '{}',
                  NODE_ENV: 'production',
                },
              });
              command.stdout.once('data', (data) => {
                info(`[Start Sidecar Output]: ${data}`);
                const response = JSON.parse(data);
                set({
                  sidecar: {
                    ...(get().sidecar || ({} as AppState['sidecar'])),
                    origin: response.origin,
                  },
                });
                console.log(`[Init Sidecar Success]: Server: ${response.origin}`);
                info(`[Init Sidecar Success]: Server: ${response.origin}`);
              });
              const errorStrs: string[] = [];
              command.stderr.on('data', (data) => {
                errorStrs.push(data);
                console.error(`[Start Sidecar Error]: ${data}`);
                error(`[Start Sidecar Error]: ${data}`);
              });
              const process = await command.spawn();
              command.on('close', () => {
                if (errorStrs.length > 0) {
                  toast({
                    description: errorStrs.join('\n'),
                  });
                }
              });
              set({
                sidecar: {
                  ...(get().sidecar || ({} as AppState['sidecar'])),
                  process,
                  spawning: true,
                },
              });
              console.log(`[Init Sidecar Success]: PID ${process.pid}`);
              info(`[Init Sidecar Success]: PID ${process.pid}`);
            } else {
              set({ sidecar: { origin: 'http://localhost:3000', spawning: false } });
            }
          } else {
            console.log(`[Sub Window Init Sidecar Success]: Server: ${get().sidecar?.origin}`);
            info(`[Sub Window Init Sidecar Success]: Server: ${get().sidecar?.origin}`);
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
            if (isProd) {
              error(errorMessage);
            }
            get().initSidecar();
          }
        }
      },
      destroySidecar: async () => {
        try {
          if (isFunction(get().sidecar?.process?.kill)) {
            await get().sidecar.process.kill();
          }
          set({ sidecar: null });
          return true;
        } catch (err) {
          console.error(`[Destroy Sidecar Error]: ${err.message || err.toString()}`);
          return false;
        }
      },
      initAppPath: async () => {
        const cacheDir = await appCacheDir();
        const imageTempDir = await join(cacheDir, 'picsharp_temp');
        const logDir = await appLogDir();
        const dataDir = await appDataDir();
        set({ imageTempDir, cacheDir, logDir, dataDir });
      },
      clearImageCache: async () => {
        try {
          if (await exists(get().imageTempDir)) {
            await remove(get().imageTempDir, { recursive: true });
          }
          await mkdir(get().imageTempDir, { recursive: true });
          info('[Clear Image Cache]: Success');
          return true;
        } catch (err) {
          console.error(`[Clear Image Cache Error]: ${err.message || err.toString()}`);
          error(`[Clear Image Cache Error]: ${err.message || err.toString()}`);
          return false;
        }
      },
    }),
    {
      version: 1,
      name: 'store:app',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) =>
        ({
          sidecar: state.sidecar,
        }) as AppStore,
    },
  ),
);

withStorageDOMEvents(useAppStore, (e) => {
  if (e.newValue) {
    useAppStore.persist.rehydrate();
  }
});

export default useAppStore;
