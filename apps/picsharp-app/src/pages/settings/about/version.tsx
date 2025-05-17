import packageJson from '@/../package.json';
import { memo, useState } from 'react';
import { useI18n } from '@/i18n';
import SettingItem from '../setting-item';
import { Button } from '@/components/ui/button';
import checkUpdate from '@/utils/updater';
import { Loader2 } from 'lucide-react';
function SettingsAboutVersion() {
  const t = useI18n();
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckUpdate = async () => {
    setIsChecking(true);
    await checkUpdate();
    setIsChecking(false);
  };

  return (
    <SettingItem
      title={t('settings.about.version.title', { version: packageJson.version })}
      description={t('settings.about.version.description')}
    >
      <Button size='sm' onClick={handleCheckUpdate} disabled={isChecking}>
        {isChecking && <Loader2 className='h-4 w-4 animate-spin' />}
        {t('settings.about.version.check_update')}
      </Button>
    </SettingItem>
  );
}

export default memo(SettingsAboutVersion);
