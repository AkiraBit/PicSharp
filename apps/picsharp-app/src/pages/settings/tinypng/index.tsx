import { Card } from '@/components/ui/card';
import Metadata from './metadata';
import ApiKeys from './api-keys';
import Section from '../section';
import { memo } from 'react';

export default memo(function SettingsTinypng() {
  return (
    <Section>
      <Card>
        <ApiKeys />
        <Metadata />
      </Card>
    </Section>
  );
});
