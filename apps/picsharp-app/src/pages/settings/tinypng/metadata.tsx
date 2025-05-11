import { memo } from 'react';
import { useI18n } from '@/i18n';
import useSettingsStore from '@/store/settings';
import useSelector from '@/hooks/useSelector';
import { SettingsKey, TinypngMetadata } from '@/constants';
import SettingItem from '../setting-item';
import { CheckboxGroup } from '@/components/checkbox-group';

function SettingsCompressionMetadata() {
  const t = useI18n();
  const { tinypng_preserve_metadata: metadata = [], set } = useSettingsStore(
    useSelector([SettingsKey.TinypngPreserveMetadata, 'set']),
  );

  const options = [
    {
      value: TinypngMetadata.Copyright,
      label: t('settings.tinypng.metadata.copyright'),
    },
    {
      value: TinypngMetadata.Creator,
      label: t('settings.tinypng.metadata.creator'),
    },
    {
      value: TinypngMetadata.Location,
      label: t('settings.tinypng.metadata.location'),
    },
  ];

  const handleValueChange = (value: string[]) => {
    set(SettingsKey.TinypngPreserveMetadata, value);
  };

  return (
    <SettingItem
      title={t('settings.tinypng.metadata.title')}
      description={t('settings.tinypng.metadata.description')}
    >
      <CheckboxGroup options={options} value={metadata} onChange={handleValueChange} />
    </SettingItem>
  );
}

export default memo(SettingsCompressionMetadata);
