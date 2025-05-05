import enUS from './locales/en-US';
import zhCN from './locales/zh-CN';
import i18next from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { createTrayMenu } from '@/utils/tray';
import type { TOptions } from 'i18next';
declare module 'i18next' {
  interface CustomTypeOptions {
    resources: {
      'en-US': typeof enUS;
      'zh-CN': typeof zhCN;
    };
    returnNull: false;
  }
}

export const useI18n = () => {
  const { t } = useTranslation();
  return (key: keyof typeof enUS, options?: TOptions) => {
    // @ts-ignore
    return t(key, options);
  };
};

// 导出非React环境下可直接使用的t函数
export const t = (key: keyof typeof enUS, options?: Record<string, any>) => {
  return i18next.t(key as string, options);
};

i18next
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    supportedLngs: ['en-US', 'zh-CN'],
    fallbackLng: {
      default: ['en-US', 'zh-CN'],
    },
    resources: {
      'en-US': { translation: enUS },
      'zh-CN': { translation: zhCN },
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

i18next.on('languageChanged', async (lng) => {
  const menu = await createTrayMenu();
  window.__TRAY_INSTANCE?.setMenu(menu);
});

export default i18next;
