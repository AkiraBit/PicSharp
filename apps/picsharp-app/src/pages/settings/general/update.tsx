import { useI18n } from '@/i18n';
import { memo } from 'react';
import useSettingsStore from '@/store/settings';
import useSelector from '@/hooks/useSelector';
import { SettingsKey } from '@/constants';
import { Switch } from '@/components/ui/switch';
import { enable, isEnabled, disable } from '@tauri-apps/plugin-autostart';
import { toast } from 'sonner';
import { useAsyncEffect } from 'ahooks';
import SettingItem from '../setting-item';

export default memo(function SettingsGeneralUpdate() {
  const t = useI18n();
  const { auto_check_update: autoCheckUpdate, set } = useSettingsStore(
    useSelector([SettingsKey.AutoCheckUpdate, 'set']),
  );

  const handleChangeAutoCheckUpdate = async (value: boolean) => {
    try {
      if (value) {
        await enable();
      } else {
        await disable();
      }
      set(SettingsKey.Autostart, value);
    } catch (error) {
      toast.error(t('tips.autostart.error'));
    }
  };

  useAsyncEffect(async () => {
    const enable = await isEnabled();
    set(SettingsKey.Autostart, enable);
  }, []);

  return (
    <SettingItem
      title={t('settings.general.update.title')}
      description={t('settings.general.update.description')}
    >
      <Switch checked={autoCheckUpdate} onCheckedChange={handleChangeAutoCheckUpdate} />
    </SettingItem>
  );
});
