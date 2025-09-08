import { useI18n } from '@/i18n';
import { memo } from 'react';
import useSettingsStore from '@/store/settings';
import useSelector from '@/hooks/useSelector';
import { CompressionMode, SettingsKey } from '@/constants';
import { Switch } from '@/components/ui/switch';
import SettingItem from '../setting-item';

export default memo(function SettingsGeneralPrivacy() {
  const t = useI18n();
  const { privacy_mode: privacyMode, set } = useSettingsStore(
    useSelector([SettingsKey.PrivacyMode, 'set']),
  );

  const handleChange = async (value: boolean) => {
    set(SettingsKey.PrivacyMode, value);
    if (value) {
      set(SettingsKey.CompressionMode, CompressionMode.Local);
    }
  };

  return (
    <SettingItem
      title={t('settings.general.privacy.title')}
      description={t('settings.general.privacy.description')}
    >
      <Switch checked={privacyMode} onCheckedChange={handleChange} />
    </SettingItem>
  );
});
