import packageJson from '@/../package.json';
import { memo, useState } from 'react';
import { useI18n } from '@/i18n';
import SettingItem from '../setting-item';
import { Button } from '@/components/ui/button';
import checkUpdate from '@/utils/updater';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function SettingsAboutVersion() {
  const t = useI18n();
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckUpdate = async () => {
    try {
      setIsChecking(true);
      const updater = await checkUpdate();
      setIsChecking(false);
      if (!updater) {
        toast.success(t('settings.about.version.no_update_available'), {
          richColors: true,
        });
      }
    } catch (error) {
      setIsChecking(false);
      console.error(error);
    }
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
