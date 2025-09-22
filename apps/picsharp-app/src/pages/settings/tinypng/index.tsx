import { Card } from '@/components/ui/card';
import Metadata from './metadata';
import ApiKeys from './api-keys';
import Section from '../section';
import { memo, useEffect, useRef } from 'react';
import { useReport } from '@/hooks/useReport';
import useSettingsStore from '@/store/settings';
export default memo(function SettingsTinypng() {
  const elRef = useRef<HTMLDivElement>(null);
  const r = useReport();

  useEffect(() => {
    const state = useSettingsStore.getState();
    r('settings_tinypng_imp', {
      has_api_keys: state.tinypng_api_keys?.length > 0,
      tinypng_preserve_metadata: state.tinypng_preserve_metadata?.join(','),
    });
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (elRef.current && hash === '#tinypng-api-keys') {
      setTimeout(() => {
        elRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        elRef.current.classList.add('breathe-highlight');
      }, 300);
    }
  }, []);

  return (
    <Section>
      <Card ref={elRef}>
        <ApiKeys />
        <Metadata />
      </Card>
    </Section>
  );
});
