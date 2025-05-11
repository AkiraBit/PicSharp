import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '@/i18n';
import { memo } from 'react';
import useSettingsStore from '@/store/settings';
import useSelector from '@/hooks/useSelector';
import { SettingsKey, CompressionType } from '@/constants';
import SettingItem from '../setting-item';
import { Badge } from '@/components/ui/badge';
export default memo(function SettingsCompressionLevel() {
  const t = useI18n();
  const { compression_level: level, set } = useSettingsStore(
    useSelector([SettingsKey.CompressionLevel, 'set']),
  );

  const options = [
    {
      value: '1',
      label: t('settings.compression.level.1'),
    },
    {
      value: '2',
      label: t('settings.compression.level.2'),
    },
    {
      value: '3',
      label: t('settings.compression.level.3'),
    },
    {
      value: '4',
      label: t('settings.compression.level.4'),
    },
    {
      value: '5',
      label: t('settings.compression.level.5'),
    },
  ];

  const handleChange = async (value: string) => {
    await set(SettingsKey.CompressionLevel, Number(value));
  };

  return (
    <SettingItem
      title={
        <>
          <span>{t('settings.compression.level.title')}</span>
          <Badge variant='third'>{t('local_compression')}</Badge>
        </>
      }
      titleClassName='flex flex-row items-center gap-x-2'
      description={t('settings.compression.level.description')}
    >
      <Select value={String(level)} onValueChange={handleChange}>
        <SelectTrigger>
          <SelectValue placeholder={t('settings.compression.level.title')} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((action) => (
              <SelectItem key={action.value} value={action.value}>
                {action.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </SettingItem>
  );
});
