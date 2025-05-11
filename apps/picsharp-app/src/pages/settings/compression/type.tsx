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
      label: t('settings.compression.type.option.lossless'),
    },
    {
      value: CompressionType.Lossy,
      label: t('settings.compression.type.option.lossy'),
    },
  ];

  const handleChange = async (value: string) => {
    await set(SettingsKey.CompressionType, value);
  };

  return (
    <SettingItem
      title={
        <>
          <span>{t('settings.compression.type.title')}</span>
          <Badge variant='third'>{t(`settings.compression.mode.option.local`)}</Badge>
        </>
      }
      titleClassName='flex flex-row items-center gap-x-2'
      description={t(`settings.compression.type.description.${type}`)}
    >
      <Select value={type} onValueChange={handleChange}>
        <SelectTrigger>
          <SelectValue placeholder={t('settings.compression.type.title')} />
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
