import { Card } from '@/components/ui/card';
import Section from '../section';
import { memo } from 'react';
import Version from './version';
export default memo(function SettingsTinypng() {
  return (
    <Section>
      <Card>
        <Version />
      </Card>
    </Section>
  );
});
