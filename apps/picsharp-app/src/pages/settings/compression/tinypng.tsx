import { memo } from 'react';
import { Card } from '@/components/ui/card';
import ApiKeys from './tinypng-api-keys';

function SettingsCompressionTinyPng() {

  return (
    <Card>
      <ApiKeys />
    </Card>
  );
}

export default memo(SettingsCompressionTinyPng);