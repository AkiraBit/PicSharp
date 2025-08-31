import { memo } from 'react';
import { useI18n } from '@/i18n';
import useSettingsStore from '@/store/settings';
import useSelector from '@/hooks/useSelector';
import { SettingsKey } from '@/constants';
import SettingItem from '../setting-item';
import { Textarea } from '@/components/ui/textarea';
import { debounce } from 'radash';
import { PathTagsInput } from '@/components/path-tags-input';

function SettingsCompressionConvert() {
  const t = useI18n();
  const { compression_watch_file_ignore: ignores = [], set } = useSettingsStore(
    useSelector([SettingsKey.CompressionWatchFileIgnore, 'set']),
  );

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
      <PathTagsInput
        title={t('settings.compression.file_ignore.title')}
        value={ignores}
        onChange={(value) => {
          set(SettingsKey.CompressionWatchFileIgnore, value);
        }}
        className='max-h-[100px] w-[350px] overflow-y-auto'
      />
    </SettingItem>
  );
}

export default memo(SettingsCompressionConvert);
