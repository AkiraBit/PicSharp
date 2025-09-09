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
  [SettingsKey.CompressionConvert]: ConvertFormat[];
  [SettingsKey.CompressionConvertAlpha]: string;
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
      [SettingsKey.CompressionOutputSaveAsFileSuffix]: '_compressed',
      [SettingsKey.CompressionOutputSaveToFolder]: '',
      [SettingsKey.CompressionConvert]: [],
      [SettingsKey.CompressionConvertAlpha]: '#FFFFFF',
      [SettingsKey.CompressionResizeDimensions]: [0, 0],
      [SettingsKey.CompressionResizeFit]: ResizeFit.Cover,
      [SettingsKey.CompressionWatermarkType]: WatermarkType.None,
      [SettingsKey.CompressionWatermarkPosition]: WatermarkPosition.BottomRight,
      [SettingsKey.CompressionWatermarkText]: '',
      [SettingsKey.CompressionWatermarkTextColor]: '#FFFFFF',
      [SettingsKey.CompressionWatermarkFontSize]: 16,
      [SettingsKey.CompressionWatermarkImagePath]: '',
      [SettingsKey.CompressionWatermarkImageOpacity]: 1,
      [SettingsKey.CompressionWatermarkImageScale]: 0.15,
      [SettingsKey.CompressionWatchFileIgnore]: [],
      [SettingsKey.TinypngApiKeys]: [],
      [SettingsKey.TinypngPreserveMetadata]: [
        TinypngMetadata.Copyright,
        TinypngMetadata.Creator,
        TinypngMetadata.Location,
      ],
      init: async (reload = false) => {
        const settingsFilePath = await join(await appDataDir(), SETTINGS_FILE_NAME);
        const defaultSettingsFilePath = await join(await appDataDir(), DEFAULT_SETTINGS_FILE_NAME);
        set({ settingsFilePath, defaultSettingsFilePath });
        const store = await load(SETTINGS_FILE_NAME);
        if (reload) {
          await store.reload();
        }
        const entries = await store.entries();
        for (const [key, value] of entries) {
          if (key === SettingsKey.CompressionOutputSaveToFolder) {
            if (!value) {
              const downloadDirPath = await downloadDir();
              await store.set(SettingsKey.CompressionOutputSaveToFolder, downloadDirPath);
              await store.save();
              set({
                [SettingsKey.CompressionOutputSaveToFolder]: downloadDirPath,
              });
            } else {
              set({
                [SettingsKey.CompressionOutputSaveToFolder]: value as string,
              });
            }
          } else if (key === SettingsKey.Language) {
            if (!value) {
              const uaLang = window.navigator.language || 'en-US';
              await store.set(SettingsKey.Language, uaLang);
              await store.save();
              set({ [SettingsKey.Language]: uaLang });
              i18next.changeLanguage(uaLang);
            } else {
              set({ [SettingsKey.Language]: value as string });
              i18next.changeLanguage(value as string);
            }
          } else {
            set({ [key]: value });
          }
        }
      },

      set: async (key, value) => {
        const store = await load(SETTINGS_FILE_NAME, { autoSave: false });
        await store.set(key, value);
        await store.save();
        set({ [key]: value });
      },

      reset: async () => {
        await copyFile(get().defaultSettingsFilePath, get().settingsFilePath);
        await get().init(true);
      },
    }),
    {
      version: 1,
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
