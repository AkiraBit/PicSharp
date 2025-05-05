import {
  useNavigate as useNavigate2,
  useLocation,
  NavigateOptions as NavigateOptions2,
  To,
} from 'react-router';
import useCompressionStore from '@/store/compression';
import { useCallback } from 'react';
import { ask, message } from '@tauri-apps/plugin-dialog';
import { isString, isObject } from 'radash';
import { useI18n } from '@/i18n';

export const blockCompressionRoutes = [
  '/compression/classic/workspace',
  '/compression/watch/workspace',
];

export interface NavigateOptions extends NavigateOptions2 {
  confirm?: boolean;
}

export function useNavigate() {
  const navigate = useNavigate2();
  const location = useLocation();
  const t = useI18n();

  return useCallback(
    async (url: To, options?: NavigateOptions) => {
      const state = useCompressionStore.getState();
      let nextUrl = '';
      if (isString(url)) {
        nextUrl = url;
      }
      if (isObject(url)) {
        nextUrl = url.pathname;
      }

      if (blockCompressionRoutes.includes(location.pathname) && state.inCompressing) {
        message(t('tips.please_wait_for_compression_to_finish'), {
          kind: 'warning',
        });
        return;
      }

      if (blockCompressionRoutes.includes(location.pathname) && state.working) {
        if (options?.confirm) {
          const answer = await ask(t('tips.are_you_sure_to_exit'), {
            kind: 'warning',
          });
          if (!answer) return;
        }
        state.reset();
      }
      navigate(url, options);
    },
    [navigate, location],
  );
}
