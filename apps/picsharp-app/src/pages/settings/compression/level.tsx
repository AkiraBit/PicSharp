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
import { SettingsKey, CompressionType, CompressionMode } from '@/constants';
import SettingItem from '../setting-item';
import { Badge } from '@/components/ui/badge';
export default memo(function SettingsCompressionLevel() {
  const t = useI18n();
  const {
    compression_level: level,
    compression_mode: mode,
    compression_type: type,
    set,
  } = useSettingsStore(
    useSelector([
      SettingsKey.CompressionLevel,
      SettingsKey.CompressionMode,
      SettingsKey.CompressionType,
      'set',
    ]),
  );

  const options = [
    {
      value: '1',
      label: t('settings.compression.level.option.1'),
    },
    {
      value: '2',
      label: t('settings.compression.level.option.2'),
    },
    {
      value: '3',
      label: t('settings.compression.level.option.3'),
    },
    {
      value: '4',
      label: t('settings.compression.level.option.4'),
    },
    {
      value: '5',
      label: t('settings.compression.level.option.5'),
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
          <Badge variant='third'>{t(`settings.compression.mode.option.local`)}</Badge>
          <Badge variant='third'>{t(`settings.compression.type.option.lossy`)}</Badge>
        </>
      }
      titleClassName='flex flex-row items-center gap-x-2'
      description={t('settings.compression.level.description')}
    >
      <Select
        value={String(level)}
        onValueChange={handleChange}
        disabled={mode === CompressionMode.Remote || type === CompressionType.Lossless}
      >
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
