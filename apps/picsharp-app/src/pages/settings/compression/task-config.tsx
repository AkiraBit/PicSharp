import { memo } from 'react';
import { Card } from '@/components/ui/card';
import Concurrency from './task-config-concurrency';
import Output from './task-config-output';
import Save from './task-config-save';
function SettingsCompressionTaskConfig() {
  return (
    <Card>
      <Concurrency />
      <Output />
      {/* <Save /> */}
    </Card>
  );
}

export default memo(SettingsCompressionTaskConfig);
