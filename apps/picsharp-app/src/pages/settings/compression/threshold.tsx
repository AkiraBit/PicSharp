import { memo } from 'react';
import { useI18n } from '@/i18n';
import useSettingsStore from '@/store/settings';
import useSelector from '@/hooks/useSelector';
import { Input } from '@/components/ui/input';
import { SettingsKey } from '@/constants';
import { Switch } from '@/components/ui/switch';
import SettingItem from '../setting-item';

export default memo(function SettingsCompressionThreshold() {
  const t = useI18n();
  const {
    compression_threshold_enable: enable,
    compression_threshold_value: value,
    set,
  } = useSettingsStore(
    useSelector([
      SettingsKey.CompressionThresholdEnable,
      SettingsKey.CompressionThresholdValue,
      'set',
    ]),
  );

  const handleCheckedChange = (checked: boolean) => {
    set(SettingsKey.CompressionThresholdEnable, checked);
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    set(SettingsKey.CompressionThresholdValue, value);
  };

  return (
    <SettingItem
      title={t('settings.compression.task_config.save_compress_rate.title')}
      description={t('settings.compression.task_config.save_compress_rate.description')}
    >
      <div className='flex items-center gap-x-2'>
        {enable && (
          <>
            <Input
              type='number'
              value={value}
              onChange={handleValueChange}
              className='h-7 w-[100px]'
              min={1}
              max={99}
              step={1}
            />
            <span>%</span>
          </>
        )}
        <Switch checked={enable} onCheckedChange={handleCheckedChange} />
      </div>
    </SettingItem>
  );
});
