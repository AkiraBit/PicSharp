import { memo } from 'react';
import { useI18n } from '@/i18n';
import useSettingsStore from '@/store/settings';
import useSelector from '@/hooks/useSelector';
import { Input } from '@/components/ui/input';
import { SettingsKey } from '@/constants';
import SettingItem from '../setting-item';

export default memo(function SettingsConcurrency() {
  const t = useI18n();
  const { concurrency, set } = useSettingsStore(useSelector([SettingsKey.Concurrency, 'set']));

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    set(SettingsKey.Concurrency, value);
  };

  return (
    <SettingItem
      title={t('settings.compression.concurrency.title')}
      description={t('settings.compression.concurrency.description')}
    >
      <Input
        type='number'
        value={concurrency}
        onChange={handleValueChange}
        className='flex-shrink-0'
        min={1}
        max={10}
      />
    </SettingItem>
  );
});
