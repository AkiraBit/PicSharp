import { create } from 'zustand';
import { load } from '@tauri-apps/plugin-store';
import {
  SETTINGS_FILE_NAME,
  DEFAULT_SETTINGS_FILE_NAME,
  SettingsKey,
  SettingsCompressionTaskConfigOutputMode,
  SettingsCompressionTaskConfigMetadata,
  SettingsCompressionAction,
  SettingsCompressionQualityMode,
} from '@/constants';
import { downloadDir, appDataDir, join } from '@tauri-apps/api/path';
import { copyFile } from '@tauri-apps/plugin-fs';
import i18next from 'i18next';

interface SettingsState {
  settingsFilePath: string;
  defaultSettingsFilePath: string;
  [SettingsKey.language]: string;
  [SettingsKey.system_notification]: boolean;
  [SettingsKey.autostart]: boolean;
  [SettingsKey.compression_action]: SettingsCompressionAction;
  [SettingsKey.compression_local_quality_level]: number;
  [SettingsKey.compression_local_quality_mode]: SettingsCompressionQualityMode;
  [SettingsKey.compression_tinypng_api_keys]: Array<{
    api_key: string;
    name: string;
    created_at: string;
    usage: number | string;
    status: 'valid' | 'invalid';
  }>;
  [SettingsKey.compression_tasks_concurrency]: number;
  [SettingsKey.compression_tasks_output_mode]: SettingsCompressionTaskConfigOutputMode;
  [SettingsKey.compression_tasks_output_mode_save_as_file_suffix]: string;
  [SettingsKey.compression_tasks_output_mode_save_to_folder]: string;
  [SettingsKey.compression_tasks_save_compress_rate_limit]: boolean;
  [SettingsKey.compression_tasks_save_compress_rate_limit_threshold]: number;
  [SettingsKey.compression_retain_metadata]: SettingsCompressionTaskConfigMetadata[];
}

interface SettingsAction {
  init: (reset?: boolean) => Promise<void>;
  set: (key: SettingsKey, value: any) => Promise<void>;
  reset: () => Promise<void>;
}

const useSettingsStore = create<SettingsState & SettingsAction>((set, get) => ({
  settingsFilePath: '',
  defaultSettingsFilePath: '',
  [SettingsKey.language]: 'en-US',
  [SettingsKey.system_notification]: false,
  [SettingsKey.autostart]: false,
  [SettingsKey.compression_action]: SettingsCompressionAction.Auto,
  [SettingsKey.compression_local_quality_level]: 4,
  [SettingsKey.compression_local_quality_mode]: SettingsCompressionQualityMode.Lossy,
  [SettingsKey.compression_tinypng_api_keys]: [],
  [SettingsKey.compression_tasks_concurrency]: 6,
  [SettingsKey.compression_tasks_output_mode]: SettingsCompressionTaskConfigOutputMode['overwrite'],
  [SettingsKey.compression_tasks_output_mode_save_as_file_suffix]: '_compressed',
  [SettingsKey.compression_tasks_output_mode_save_to_folder]: '',
  [SettingsKey.compression_tasks_save_compress_rate_limit]: false,
  [SettingsKey.compression_tasks_save_compress_rate_limit_threshold]: 0.2,
  [SettingsKey.compression_retain_metadata]: [
    SettingsCompressionTaskConfigMetadata.Copyright,
    SettingsCompressionTaskConfigMetadata.Creator,
    SettingsCompressionTaskConfigMetadata.Location,
  ],
  init: async (reset) => {
    const settingsFilePath = await join(await appDataDir(), SETTINGS_FILE_NAME);
    const defaultSettingsFilePath = await join(await appDataDir(), DEFAULT_SETTINGS_FILE_NAME);
    set({ settingsFilePath, defaultSettingsFilePath });
    const store = await load(SETTINGS_FILE_NAME);
    if (reset) {
      await store.reload();
    }
    const entries = await store.entries();
    for (const [key, value] of entries) {
      if (key === SettingsKey.compression_tasks_output_mode_save_to_folder) {
        if (!value) {
          const downloadDirPath = await downloadDir();
          await store.set(
            SettingsKey.compression_tasks_output_mode_save_to_folder,
            downloadDirPath,
          );
          await store.save();
          set({
            [SettingsKey.compression_tasks_output_mode_save_to_folder]: downloadDirPath,
          });
        } else {
          set({
            [SettingsKey.compression_tasks_output_mode_save_to_folder]: value as string,
          });
        }
      } else if (key === SettingsKey.language) {
        if (!value) {
          const uaLang = window.navigator.language || 'en-US';
          await store.set(SettingsKey.language, uaLang);
          await store.save();
          set({ [SettingsKey.language]: uaLang });
          i18next.changeLanguage(uaLang);
        } else {
          set({ [SettingsKey.language]: value as string });
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
}));

export default useSettingsStore;

(async function () {
  await useSettingsStore.getState().init();
})();
