import { useI18n } from '@/i18n';
import { memo, useContext } from 'react';
import useSettingsStore from '@/store/settings';
import useSelector from '@/hooks/useSelector';
import { SettingsKey } from '@/constants';
import { Switch } from '@/components/ui/switch';
import SettingItem from '../setting-item';
import { AppContext } from '@/routes';

export default memo(function SettingsGeneralUpdate() {
  const t = useI18n();
  const { auto_check_update: autoCheckUpdate, set } = useSettingsStore(
    useSelector([SettingsKey.AutoCheckUpdate, 'set']),
  );
  const { messageApi } = useContext(AppContext);

  const handleChangeAutoCheckUpdate = async (value: boolean) => {
    set(SettingsKey.AutoCheckUpdate, value);
  };

  return (
    <SettingItem
      title={t('settings.general.update.title')}
      description={t('settings.general.update.description')}
    >
      <Switch checked={autoCheckUpdate} onCheckedChange={handleChangeAutoCheckUpdate} />
    </SettingItem>
  );
});
