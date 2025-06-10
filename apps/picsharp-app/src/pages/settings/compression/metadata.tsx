import { memo } from 'react';
import { useI18n } from '@/i18n';
import useSettingsStore from '@/store/settings';
import useSelector from '@/hooks/useSelector';
import { SettingsKey } from '@/constants';
import SettingItem from '../setting-item';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

function SettingsCompressionMetadata() {
  const t = useI18n();
  const { compression_keep_metadata: keepMetadata = false, set } = useSettingsStore(
    useSelector([SettingsKey.CompressionKeepMetadata, 'set']),
  );

  const handleCheckedChange = (checked: boolean) => {
    set(SettingsKey.CompressionKeepMetadata, checked);
  };
  return (
    <SettingItem
      title={
        <>
          <span>{t('settings.compression.metadata.title')}</span>
          <Badge variant='third'>{t(`settings.compression.mode.option.local`)}</Badge>
        </>
      }
      titleClassName='flex flex-row items-center gap-x-2'
      description={t('settings.compression.metadata.description')}
    >
      <Switch checked={keepMetadata} onCheckedChange={handleCheckedChange} />
    </SettingItem>
  );
}

export default memo(SettingsCompressionMetadata);
