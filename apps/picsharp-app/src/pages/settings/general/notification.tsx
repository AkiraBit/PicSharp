import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { useI18n } from '../../../i18n';
import { memo } from 'react';
import useSettingsStore from '../../../store/settings';
import useSelector from '@/hooks/useSelector';
import { SettingsKey } from '@/constants';
import { invoke } from '@tauri-apps/api/core';
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import { Button } from '@/components/ui/button';
import { platform } from '@tauri-apps/plugin-os';

const isMacOS = platform() === 'macos';

export default memo(function SettingsGeneralNotification() {
  const { i18n } = useTranslation();
  const t = useI18n();
  const { system_notification, set } = useSettingsStore(
    useSelector([SettingsKey.system_notification, 'set']),
  );

  const handleChangeNotification = async () => {
    await invoke('ipc_open_system_preference_notifications');
  };

  return (
    <CardHeader className='flex flex-row justify-between'>
      <div>
        <CardTitle className='text-lg'>{t('settings.general.notification.title')}</CardTitle>
        <CardDescription>
          {isMacOS
            ? t('settings.general.notification.description_macos')
            : t('settings.general.notification.description_other')}
        </CardDescription>
      </div>
      {isMacOS && (
        <Button variant='outline' onClick={handleChangeNotification}>
          {t('settings.general.notification.got_to_set')}
        </Button>
      )}
    </CardHeader>
  );
});
