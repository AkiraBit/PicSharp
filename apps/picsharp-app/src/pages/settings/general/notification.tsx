import { useI18n } from '@/i18n';
import { memo, useContext } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import SettingItem from '../setting-item';
import { AppContext } from '@/routes';

export default memo(function SettingsGeneralNotification() {
  const t = useI18n();

  const { messageApi } = useContext(AppContext);

  const handleChangeNotification = async () => {
    const result = await invoke<{ success: boolean; error?: string }>(
      'ipc_open_system_preference_notifications',
    );
    if (!result.success) {
      console.error('Failed to open system notification settings', result.error);
      messageApi?.error(result.error ?? 'Failed to open system notification settings');
    }
  };

  return (
    <SettingItem
      title={t('settings.general.notification.title')}
      description={t('settings.general.notification.description')}
    >
      <Button variant='outline' onClick={handleChangeNotification} className='w-full'>
        {t('settings.general.notification.got_to_set')}
      </Button>
    </SettingItem>
  );
});
