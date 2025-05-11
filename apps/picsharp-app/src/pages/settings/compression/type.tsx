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

export default memo(function SettingsCompressionType() {
  const t = useI18n();
  const { compression_type: type, set } = useSettingsStore(
    useSelector([SettingsKey.CompressionType, 'set']),
  );

  const options = [
    {
      value: CompressionType.Lossless,
      label: t('lossless_compression'),
    },
    {
      value: CompressionType.Lossy,
      label: t('lossy_compression'),
    },
  ];

  const handleChange = async (value: string) => {
    await set(SettingsKey.CompressionType, value);
  };

  return (
    <SettingItem
      title={
        <>
          <span>{t('settings.compression.compression_type.title')}</span>
          <Badge variant='third'>{t('local_compression')}</Badge>
        </>
      }
      titleClassName='flex flex-row items-center gap-x-2'
      description={t('settings.compression.compression_type.description')}
    >
      <Select value={type} onValueChange={handleChange}>
        <SelectTrigger>
          <SelectValue placeholder={t('settings.compression.compression_type.title')} />
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
