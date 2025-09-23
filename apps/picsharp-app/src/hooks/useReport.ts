import { useAptabase } from '@aptabase/react';
import { captureError } from '@/utils';
import { useCallback } from 'react';
class ReportError extends Error {
  cause: Error;
  constructor(error: Error) {
    super(`Report Failed: ${error.message}`);
    this.name = 'ReportError';
  }
}

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
