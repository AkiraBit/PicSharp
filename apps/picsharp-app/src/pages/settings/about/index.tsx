import { Card } from '@/components/ui/card';
import Section from '../section';
import { memo } from 'react';
import Version from './version';
import Feedback from './feedback';
import Detail from './detail';
export default memo(function SettingsTinypng() {
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
