import { memo } from 'react';
import { useI18n } from '@/i18n';
import useSettingsStore from '@/store/settings';
import useSelector from '@/hooks/useSelector';
import { Input } from '@/components/ui/input';
import { SettingsKey } from '@/constants';
import { Switch } from '@/components/ui/switch';
import SettingItem from '../setting-item';
import { correctFloat } from '@/utils';

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
    let value = Number(e.target.value);
    if (value > 99) {
      value = 99;
    } else if (value < 1) {
      value = 1;
    }
    set(SettingsKey.CompressionThresholdValue, correctFloat(value / 100));
  };

  return (
    <SettingItem
      title={t('settings.compression.threshold.title')}
      description={t('settings.compression.threshold.description')}
    >
      <div className='flex items-center gap-x-2'>
        <Switch checked={enable} onCheckedChange={handleCheckedChange} />
        <Input
          type='number'
          value={value * 100}
          onChange={handleValueChange}
          className='h-7 w-[100px]'
          min={1}
          max={99}
          step={1}
          disabled={!enable}
        />
        <span>%</span>
      </div>
    </SettingItem>
  );
});
