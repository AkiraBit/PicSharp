import { Card } from '@/components/ui/card';
import Section from '../section';
import { memo, useEffect } from 'react';
import Version from './version';
import Feedback from './feedback';
import Detail from './detail';
import { useReport } from '@/hooks/useReport';
export default memo(function SettingsTinypng() {
  const r = useReport();

  useEffect(() => {
    r('settings_about_imp');
  }, []);

  return (
    <Section>
      <Card>
        <Version />
        <Feedback />
        <Detail />
      </Card>
    </Section>
  );
});
