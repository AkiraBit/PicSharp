import { memo } from 'react';
import { useI18n } from '@/i18n';
import SettingItem from '../setting-item';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { useReport } from '@/hooks/useReport';

function SettingsAboutVersion() {
  const t = useI18n();
  const r = useReport();

  return (
    <SettingItem
      title={t('settings.about.feedback.title')}
      description={t('settings.about.feedback.description')}
    >
      <a href='https://picsharp.userjot.com/' target='_blank' onClick={() => r('feedback_click')}>
        <Button size='icon' variant='link'>
          <ChevronRight className='h-4 w-4' />
        </Button>
      </a>
    </SettingItem>
  );
}

export default memo(SettingsAboutVersion);
