import { useAptabase } from '@aptabase/react';
import { captureError, ReportError } from '@/utils';
import { useCallback } from 'react';

export const useReport = () => {
  const { trackEvent } = useAptabase();
  const r = useCallback((event: string, payload?: Record<string, any>) => {
    try {
      trackEvent(event, payload).catch((error) => {
        captureError(new ReportError(error));
      });
    } catch (_) {}
  }, []);
  return r;
};
