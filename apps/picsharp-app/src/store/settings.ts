import { create } from 'zustand';
import { load } from '@tauri-apps/plugin-store';
import {
  SETTINGS_FILE_NAME,
  DEFAULT_SETTINGS_FILE_NAME,
  SettingsKey,
  CompressionOutputMode,
  TinypngMetadata,
  CompressionMode,
  CompressionType,
  ConvertFormat,
  ResizeFit,
  WatermarkType,
  WatermarkPosition,
} from '@/constants';
import { downloadDir, appDataDir, join } from '@tauri-apps/api/path';
import { copyFile } from '@tauri-apps/plugin-fs';
import i18next from 'i18next';
import { withStorageDOMEvents } from './withStorageDOMEvents';
import { createJSONStorage, persist } from 'zustand/middleware';

interface SettingsState {
  appDataDirPath: string;
  settingsFilePath: string;
  defaultSettingsFilePath: string;
  [SettingsKey.Language]: string;
  [SettingsKey.Autostart]: boolean;
  [SettingsKey.AutoCheckUpdate]: boolean;
  [SettingsKey.PrivacyMode]: boolean;
  [SettingsKey.CompressionMode]: CompressionMode;
  [SettingsKey.CompressionType]: CompressionType;
  [SettingsKey.CompressionLevel]: number;
  [SettingsKey.CompressionKeepMetadata]: boolean;
  [SettingsKey.Concurrency]: number;
  [SettingsKey.CompressionThresholdEnable]: boolean;
  [SettingsKey.CompressionThresholdValue]: number;
  [SettingsKey.CompressionOutput]: CompressionOutputMode;
  [SettingsKey.CompressionOutputSaveAsFileSuffix]: string;
  [SettingsKey.CompressionOutputSaveToFolder]: string;
  [SettingsKey.CompressionConvertEnable]: boolean;
  [SettingsKey.CompressionConvert]: ConvertFormat[];
  [SettingsKey.CompressionConvertAlpha]: string;
  [SettingsKey.CompressionResizeEnable]: boolean;
  [SettingsKey.CompressionResizeDimensions]: [number, number];
  [SettingsKey.CompressionResizeFit]: ResizeFit;
  [SettingsKey.CompressionWatermarkType]: WatermarkType;
  [SettingsKey.CompressionWatermarkPosition]: WatermarkPosition;
  [SettingsKey.CompressionWatermarkText]: string;
  [SettingsKey.CompressionWatermarkTextColor]: string;
  [SettingsKey.CompressionWatermarkFontSize]: number;
  [SettingsKey.CompressionWatermarkImagePath]: string;
  [SettingsKey.CompressionWatermarkImageOpacity]: number;
  [SettingsKey.CompressionWatermarkImageScale]: number;
  [SettingsKey.CompressionWatchFileIgnore]: string[];
  [SettingsKey.TinypngApiKeys]: Array<{
    api_key: string;
    name: string;
    created_at: string;
    usage: number | string;
    status: 'valid' | 'invalid';
  }>;
  [SettingsKey.TinypngPreserveMetadata]: TinypngMetadata[];
}

interface SettingsAction {
  init: (reload?: boolean) => Promise<void>;
  set: (key: SettingsKey, value: any) => Promise<void>;
  reset: () => Promise<void>;
}

type SettingsStore = SettingsState & SettingsAction;

const useSettingsStore = create(
  persist<SettingsStore>(
    (set, get) => ({
      appDataDirPath: '',
      settingsFilePath: '',
      defaultSettingsFilePath: '',
      [SettingsKey.Language]: 'en-US',
      [SettingsKey.Autostart]: false,
      [SettingsKey.AutoCheckUpdate]: true,
      [SettingsKey.PrivacyMode]: false,
      [SettingsKey.CompressionMode]: CompressionMode.Local,
      [SettingsKey.CompressionType]: CompressionType.Lossy,
      [SettingsKey.CompressionLevel]: 4,
      [SettingsKey.CompressionKeepMetadata]: true,
      [SettingsKey.Concurrency]: 6,
      [SettingsKey.CompressionThresholdEnable]: false,
      [SettingsKey.CompressionThresholdValue]: 0.1,
      [SettingsKey.CompressionOutput]: CompressionOutputMode.Overwrite,
      [SettingsKey.CompressionOutputSaveAsFileSuffix]: '_min',
      [SettingsKey.CompressionOutputSaveToFolder]: '',
      [SettingsKey.CompressionConvertEnable]: false,
      [SettingsKey.CompressionConvert]: [],
      [SettingsKey.CompressionConvertAlpha]: '#FFFFFF',
      [SettingsKey.CompressionResizeEnable]: false,
      [SettingsKey.CompressionResizeDimensions]: [0, 0],
      [SettingsKey.CompressionResizeFit]: ResizeFit.Cover,
      [SettingsKey.CompressionWatermarkType]: WatermarkType.None,
      [SettingsKey.CompressionWatermarkPosition]: WatermarkPosition.BottomRight,
      [SettingsKey.CompressionWatermarkText]: '',
      [SettingsKey.CompressionWatermarkTextColor]: '#FFFFFF',
      [SettingsKey.CompressionWatermarkFontSize]: 72,
      [SettingsKey.CompressionWatermarkImagePath]: '',
      [SettingsKey.CompressionWatermarkImageOpacity]: 1,
      [SettingsKey.CompressionWatermarkImageScale]: 0.15,
      [SettingsKey.CompressionWatchFileIgnore]: ['.git', 'node_modules'],
      [SettingsKey.TinypngApiKeys]: [],
      [SettingsKey.TinypngPreserveMetadata]: [
        TinypngMetadata.Copyright,
        TinypngMetadata.Creator,
        TinypngMetadata.Location,
      ],
      init: async (reload = false) => {
        const appDataDirPath = await appDataDir();
        const settingsFilePath = await join(appDataDirPath, SETTINGS_FILE_NAME);
        const defaultSettingsFilePath = await join(appDataDirPath, DEFAULT_SETTINGS_FILE_NAME);
        set({ appDataDirPath, settingsFilePath, defaultSettingsFilePath });
        const store = await load(SETTINGS_FILE_NAME);
        if (reload) {
          await store.reload();
        }
        const entries = await store.entries();
        for (const [key, value] of entries) {
          if (key === SettingsKey.CompressionOutputSaveToFolder) {
            if (!value) {
              const downloadDirPath = await downloadDir();
              set({
                [SettingsKey.CompressionOutputSaveToFolder]: downloadDirPath,
              });
              await store.set(SettingsKey.CompressionOutputSaveToFolder, downloadDirPath);
              await store.save();
            } else {
              set({
                [SettingsKey.CompressionOutputSaveToFolder]: value as string,
              });
            }
          } else if (key === SettingsKey.Language) {
            if (!value) {
              const uaLang = window.navigator.language || 'en-US';
              set({ [SettingsKey.Language]: uaLang });
              i18next.changeLanguage(uaLang);
              await store.set(SettingsKey.Language, uaLang);
              await store.save();
            } else {
              set({ [SettingsKey.Language]: value as string });
              if (i18next.language !== (value as string)) {
                i18next.changeLanguage(value as string);
              }
            }
          } else if (key === SettingsKey.CompressionWatermarkPosition) {
            // Compatible with old values to avoid error reports
            if (value === 'bottom_right') {
              set({ [SettingsKey.CompressionWatermarkPosition]: WatermarkPosition.BottomRight });
            } else {
              set({ [key]: value as WatermarkPosition });
            }
          } else {
            set({ [key]: value });
          }
        }
      },

      set: async (key, value) => {
        set({ [key]: value });
        const store = await load(SETTINGS_FILE_NAME, { autoSave: false });
        await store.set(key, value);
        await store.save();
      },

      reset: async () => {
        await copyFile(get().defaultSettingsFilePath, get().settingsFilePath);
        await get().init(true);
      },
    }),
    {
      version: 2,
      name: 'store:settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => state as SettingsStore,
    },
  ),
);

withStorageDOMEvents(useSettingsStore, (e) => {
  if (e.newValue) {
    useSettingsStore.getState().init(true);
  }
});

useSettingsStore.getState().init();

export default useSettingsStore;
