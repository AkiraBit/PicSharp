import { memo } from 'react';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useI18n } from '@/i18n';
import useSettingsStore from '@/store/settings';
import useSelector from '@/hooks/useSelector';
import { Input } from '@/components/ui/input';
import { SettingsKey } from '@/constants';
import { Switch } from '@/components/ui/switch';

function SettingsCompressionTaskConfigSave() {
  const t = useI18n();
  const {
    compression_tasks_save_compress_rate_limit: hasLimit,
    compression_tasks_save_compress_rate_limit_threshold: threshold,
    set,
  } = useSettingsStore(
    useSelector([
      SettingsKey.compression_tasks_save_compress_rate_limit,
      SettingsKey.compression_tasks_save_compress_rate_limit_threshold,
      'set',
    ]),
  );

  const handleLimitChange = (checked: boolean) => {
    set(SettingsKey.compression_tasks_save_compress_rate_limit, checked);
  };

  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    set(SettingsKey.compression_tasks_save_compress_rate_limit_threshold, value);
  };

  return (
    <CardHeader className='flex flex-row justify-between gap-x-10'>
      <div>
        <CardTitle className='text-lg'>
          {t('settings.compression.task_config.save_compress_rate.title')}
        </CardTitle>
        <CardDescription>
          {t('settings.compression.task_config.save_compress_rate.description')}
        </CardDescription>
      </div>
      <div className='flex items-center gap-x-2'>
        {hasLimit && (
          <>
            <Input
              type='number'
              value={threshold}
              onChange={handleThresholdChange}
              className='h-7 w-[100px]'
              min={1}
              max={99}
              step={1}
            />
            <span>%</span>
          </>
        )}
        <Switch checked={hasLimit} onCheckedChange={handleLimitChange} />
      </div>
    </CardHeader>
  );
}

export default memo(SettingsCompressionTaskConfigSave);
