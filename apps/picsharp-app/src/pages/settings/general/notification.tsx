import { useI18n } from '@/i18n';
import { memo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { platform } from '@tauri-apps/plugin-os';
import SettingItem from '../setting-item';

const isMacOS = platform() === 'macos';

export default memo(function SettingsGeneralNotification() {
  const t = useI18n();

  const handleChangeNotification = async () => {
    await invoke('ipc_open_system_preference_notifications');
  };

  return (
    <SettingItem title={t('settings.general.notification.title')}>
      {isMacOS && (
        <Button variant='outline' onClick={handleChangeNotification} className='w-full'>
          {t('settings.general.notification.got_to_set')}
        </Button>
      )}
    </SettingItem>
  );
});
