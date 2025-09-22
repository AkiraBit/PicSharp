import { Card } from '@/components/ui/card';
import Mode from './mode';
import Section from '../section';
import Output from './output';
import Threshold from './threshold';
import Type from './type';
import Level from './level';
import { useEffect, useRef } from 'react';
import Convert from './convert';
import Metadata from './metadata';
import WatchIgnore from './watch-ignore';
import Resize from './resize';
import Watermark from './watermark';
import { useReport } from '@/hooks/useReport';
import useSettingsStore from '@/store/settings';

export default function SettingsCompression() {
  const outputElRef = useRef<HTMLDivElement>(null);
  const r = useReport();

  useEffect(() => {
    const state = useSettingsStore.getState();
    r('settings_compression_imp', {
      compression_mode: state.compression_mode,
      compression_type: state.compression_type,
      compression_level: state.compression_level,
      compression_keep_metadata: state.compression_keep_metadata,
      save_mode: state.compression_output,
      convert_enable: state.compression_convert_enable,
      convert_types: state.compression_convert?.join(','),
      convert_alpha: state.compression_convert_alpha,
      resize_enable: state.compression_resize_enable,
      resize_fit: state.compression_resize_fit,
      watermark_type: state.compression_watermark_type,
      has_ignore_files: state.compression_watch_file_ignore?.length > 0,
    });
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (outputElRef.current && hash === '#output') {
      setTimeout(() => {
        outputElRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        outputElRef.current.classList.add('breathe-highlight');
      }, 300);
    }
  }, []);

  return (
    <Section>
      <Card>
        <Mode />
        <Type />
        <Level />
        <Metadata />
      </Card>
      <Card ref={outputElRef}>
        <Output />
        <Threshold />
      </Card>
      <Card>
        <Convert />
      </Card>
      <Card>
        <Resize />
      </Card>
      <Card>
        <Watermark />
      </Card>
      <Card>
        <WatchIgnore />
      </Card>
    </Section>
  );
}
