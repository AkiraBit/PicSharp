import packageJson from '@/../package.json';
import { memo, useState, useContext } from 'react';
import { useI18n } from '@/i18n';
import SettingItem from '../setting-item';
import { Button } from '@/components/ui/button';
import checkUpdate from '@/utils/updater';
import { Loader2 } from 'lucide-react';
import { Trans } from 'react-i18next';
import { AppContext } from '@/routes';
import { invoke } from '@tauri-apps/api/core';

let clickCount = 0;

function SettingsAboutVersion() {
  const t = useI18n();
  const [isChecking, setIsChecking] = useState(false);
  const { messageApi } = useContext(AppContext);

  const handleCheckUpdate = async () => {
    try {
      setIsChecking(true);
      const updater = await checkUpdate();
      setIsChecking(false);
      if (!updater) {
        messageApi?.success(t('settings.about.version.no_update_available'));
      }
    } catch (error) {
      setIsChecking(false);
      messageApi?.error(t('settings.about.version.check_update_failed'));
      console.error(error);
    }
  };

  const handleTitleClick = () => {
    clickCount++;
    if (clickCount === 5) {
      invoke('ipc_open_devtool');
      clickCount = 0;
    }
  };

  return (
    <SettingItem
      title={
        <span onClick={handleTitleClick}>
          {t('settings.about.version.title', { version: packageJson.version })}
        </span>
      }
      // description={
      //   <Trans
      //     // @ts-ignore
      //     i18nKey='settings.about.version.description'
      //     components={{
      //       license: (
      //         <a
      //           target='_blank'
      //           href='https://github.com/AkiraBit/PicSharp?tab=AGPL-3.0-1-ov-file#readme'
      //           className='text-blue-500 underline'
      //         />
      //       ),
      //     }}
      //   ></Trans>
      // }
    >
      <Button size='sm' onClick={handleCheckUpdate} disabled={isChecking}>
        {isChecking && <Loader2 className='h-4 w-4 animate-spin' />}
        {t('settings.about.version.check_update')}
      </Button>
    </SettingItem>
  );
}

export default memo(SettingsAboutVersion);
