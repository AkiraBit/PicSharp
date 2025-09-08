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
import { SettingsKey, CompressionMode as Mode } from '@/constants';
import SettingItem from '../setting-item';

export default memo(function SettingsCompressionMode() {
  const t = useI18n();
  const {
    compression_mode: mode,
    privacy_mode: privacyMode,
    set,
  } = useSettingsStore(useSelector([SettingsKey.CompressionMode, SettingsKey.PrivacyMode, 'set']));

  const modes = [
    {
      value: Mode.Auto,
      label: t('settings.compression.mode.option.auto'),
    },
    {
      value: Mode.Remote,
      label: t('settings.compression.mode.option.remote'),
    },
    {
      value: Mode.Local,
      label: t('settings.compression.mode.option.local'),
    },
  ];

  const handleChange = async (value: string) => {
    await set(SettingsKey.CompressionMode, value);
  };

  return (
    <SettingItem
      title={t('settings.compression.mode.title')}
      description={t(`settings.compression.mode.description.${mode}`)}
    >
      <Select value={mode} onValueChange={handleChange} disabled={privacyMode}>
        <SelectTrigger>
          <SelectValue placeholder={t('settings.compression.mode.title')} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {modes.map((action) => (
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
