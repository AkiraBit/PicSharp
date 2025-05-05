import { memo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useI18n } from '@/i18n';
import useSettingsStore from '@/store/settings';
import useSelector from '@/hooks/useSelector';
import { SettingsKey, SettingsCompressionTaskConfigMetadata } from '@/constants';
import { debounce } from 'radash';

import { CheckboxGroup } from '@radix-ui/themes';

function SettingsCompressionMetadata() {
  const t = useI18n();
  const { compression_retain_metadata: metadata = [], set } = useSettingsStore(
    useSelector([SettingsKey.compression_retain_metadata, 'set']),
  );

  const handleValueChange = (value: string[]) => {
    set(SettingsKey.compression_retain_metadata, value);
  };

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between gap-x-10'>
        <div>
          <CardTitle className='text-lg'>
            {t('settings.compression.task_config.metadata.title')}
          </CardTitle>
          <CardDescription>
            {t('settings.compression.task_config.metadata.description')}
          </CardDescription>
        </div>
        <div>
          <CheckboxGroup.Root
            value={metadata}
            color='gray'
            highContrast
            onValueChange={handleValueChange}
          >
            <CheckboxGroup.Item value={SettingsCompressionTaskConfigMetadata.Copyright}>
              {t('settings.compression.task_config.metadata.copyright')}
            </CheckboxGroup.Item>
            <CheckboxGroup.Item value={SettingsCompressionTaskConfigMetadata.Creator}>
              {t('settings.compression.task_config.metadata.creator')}
            </CheckboxGroup.Item>
            <CheckboxGroup.Item value={SettingsCompressionTaskConfigMetadata.Location}>
              {t('settings.compression.task_config.metadata.location')}
            </CheckboxGroup.Item>
          </CheckboxGroup.Root>
        </div>
      </CardHeader>
    </Card>
  );
}

export default memo(SettingsCompressionMetadata);
