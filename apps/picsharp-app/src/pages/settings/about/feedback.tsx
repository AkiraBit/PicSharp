import { memo } from 'react';
import { useI18n } from '@/i18n';
import SettingItem from '../setting-item';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

function SettingsAboutVersion() {
  const t = useI18n();
  return (
    <SettingItem
      title={t('settings.about.feedback.title')}
      description={t('settings.about.feedback.description')}
    >
      <a href='https://github.com/AkiraBit/PicSharp/issues' target='_blank'>
        <Button size='icon' variant='link'>
          <ChevronRight className='h-4 w-4' />
        </Button>
      </a>
    </SettingItem>
  );
}

export default memo(SettingsAboutVersion);
