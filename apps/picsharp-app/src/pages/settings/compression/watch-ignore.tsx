import { memo } from 'react';
import { useI18n } from '@/i18n';
import useSettingsStore from '@/store/settings';
import useSelector from '@/hooks/useSelector';
import { SettingsKey } from '@/constants';
import SettingItem from '../setting-item';
import { Textarea } from '@/components/ui/textarea';
import { debounce } from 'radash';

function SettingsCompressionConvert() {
  const t = useI18n();
  const { compression_watch_file_ignore: ignores = [], set } = useSettingsStore(
    useSelector([SettingsKey.CompressionWatchFileIgnore, 'set']),
  );

  const handleChange = debounce({ delay: 500 }, (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const items = e.target.value
      .trim()
      .split('\n')
      .filter((item) => item.trim() !== '')
      .map((item) => item.trim());
    set(SettingsKey.CompressionWatchFileIgnore, items);
  });

  return (
    <SettingItem
      title={
        <>
          <span>{t('settings.compression.file_ignore.title')}</span>
        </>
      }
      titleClassName='flex flex-row items-center gap-x-2'
      description={t('settings.compression.file_ignore.description')}
    >
      <Textarea defaultValue={ignores.join('\n')} className='w-[250px]' onChange={handleChange} />
    </SettingItem>
  );
}

export default memo(SettingsCompressionConvert);
