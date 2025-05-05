import { memo } from 'react';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useI18n } from '@/i18n';
import useSettingsStore from '@/store/settings';
import useSelector from '@/hooks/useSelector';
import { Input } from '@/components/ui/input';
import { SettingsKey } from '@/constants';

function SettingsCompressionTaskConfigConcurrency() {
  const t = useI18n();
  const {
    compression_tasks_concurrency: concurrency,
    set
  } = useSettingsStore(useSelector([SettingsKey.compression_tasks_concurrency,'set']));

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    set(SettingsKey.compression_tasks_concurrency, value);
  };
  
  return (
    <CardHeader className="flex flex-row justify-between gap-x-10">
      <div>
        <CardTitle className="text-lg">{t('settings.compression.task_config.concurrency.title')}</CardTitle>
        <CardDescription>{t('settings.compression.task_config.concurrency.description')}</CardDescription>
      </div>
      <Input 
        type="number" 
        value={concurrency}
        onChange={handleValueChange} 
        className="w-[180px]"
        min={1}
        max={10}
      />
    </CardHeader>
  );
}

export default memo(SettingsCompressionTaskConfigConcurrency);