import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import EventEmitter from 'eventemitter3';
import { isProd } from '@/utils';
import { Command, Child } from '@tauri-apps/plugin-shell';
import { exists, remove, mkdir } from '@tauri-apps/plugin-fs';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { withStorageDOMEvents } from './withStorageDOMEvents';
import { isFunction } from 'radash';
import { appCacheDir, appDataDir, appLogDir, join } from '@tauri-apps/api/path';
import { toast } from '@/components/sidecar-error-toast';
import { captureError } from '@/utils';
import { SidecarError } from '@/extends/SidecarError';

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
          await get().destroySidecar();
          if (getCurrentWebviewWindow().label === 'main') {
            if (isProd) {
              const command = Command.sidecar('binaries/picsharp-sidecar', '', {
                env: {
                  PICSHARP_SIDECAR_ENABLE: 'true',
                  PICSHARP_SIDECAR_CLUSTER: 'false',
                  PICSHARP_SIDECAR_MODE: 'server',
                  PICSHARP_SIDECAR_STORE: '{}',
                  PICSHARP_SIDECAR_SENTRY_DSN: __PICSHARP_SIDECAR_SENTRY_DSN__,
                  NODE_ENV: 'production',
                },
              });
              command.stdout.once('data', (data) => {
                console.log(`[Start Sidecar Output]: ${data}`);
                const response = JSON.parse(data);
                set({
                  sidecar: {
                    ...(get().sidecar || ({} as AppState['sidecar'])),
                    origin: response.origin,
                  },
                });
                console.log(`[Init Sidecar Success]: Server: ${response.origin}`);
              });
              const errorStrs: string[] = [];
              command.stderr.on('data', (data) => {
                errorStrs.push(data);
                console.error(`[Start Sidecar Error]: ${data}`);
              });
              const process = await command.spawn();
              command.on('close', () => {
                if (errorStrs.length > 0) {
                  const errorMessage = errorStrs.join('\n');
                  toast({
                    description: errorMessage,
                  });
                  captureError(new SidecarError('Sidecar Error', { errorMessage }));
                  errorStrs.length = 0;
                }
                get().destroySidecar();
              });
              set({
                sidecar: {
                  ...(get().sidecar || ({} as AppState['sidecar'])),
                  process,
                  spawning: true,
                },
              });
              console.log(`[Init Sidecar Success]: PID ${process.pid}`);
            } else {
              set({ sidecar: { origin: 'http://localhost:3000', spawning: false } });
            }
          } else {
            console.log(`[Sub Window Init Sidecar Success]: Server: ${get().sidecar?.origin}`);
          }
        } catch (error) {
          captureError(error);
          console.error(`[Init Sidecar Error]: ${error.message || error.toString()}`);
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
          } catch (error) {
            const errorMessage = `[Sidecar Heartbeat Error]: ${error.message || error.toString()}`;
            console.error(errorMessage);
            get().initSidecar();
            captureError(new SidecarError(errorMessage));
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
        } catch (error) {
          captureError(new Error(`[Destroy Sidecar Error]: ${error.message || error.toString()}`));
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
          return true;
        } catch (error) {
          console.error(`[Clear Image Cache Error]: ${error.message || error.toString()}`);
          captureError(
            new Error(`[Clear Image Cache Error]: ${error.message || error.toString()}`),
            undefined,
            'clear_image_cache_error',
          );
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
