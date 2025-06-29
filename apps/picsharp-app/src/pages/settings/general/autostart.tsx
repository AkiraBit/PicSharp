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

export default memo(function SettingsGeneralAutostart() {
  const t = useI18n();
  const { autostart, set } = useSettingsStore(useSelector([SettingsKey.Autostart, 'set']));

  const handleChangeAutostart = async (value: boolean) => {
    try {
      if (value) {
        await enable();
      } else {
        await disable();
      }
      set(SettingsKey.Autostart, value);
    } catch (error) {
      console.error('Failed to control autostart', error);
      toast.error(t('tips.autostart.error'));
    }
  };

  useAsyncEffect(async () => {
    const enable = await isEnabled();
    set(SettingsKey.Autostart, enable);
  }, []);

  return (
    <SettingItem
      title={t('settings.general.autostart.title')}
      description={t('settings.general.autostart.description')}
    >
      <Switch checked={autostart} onCheckedChange={handleChangeAutostart} />
    </SettingItem>
  );
});
