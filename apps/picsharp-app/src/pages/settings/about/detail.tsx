import { memo } from 'react';
import { useI18n } from '@/i18n';
import SettingItem from '../setting-item';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { Github } from 'lucide-react';
import { useReport } from '@/hooks/useReport';

function SettingsAboutVersion() {
  const t = useI18n();
  const r = useReport();

  return (
    <SettingItem
      title={
        <div className='flex items-center gap-2'>
          <Github className='h-4 w-4' />
          <span>GitHub</span>
        </div>
      }
      description={t('settings.about.detail.description')}
    >
      <a
        href='https://github.com/AkiraBit/PicSharp'
        target='_blank'
        onClick={() => r('github_click')}
      >
        <Button size='icon' variant='link'>
          <ChevronRight className='h-4 w-4' />
        </Button>
      </a>
    </SettingItem>
  );
}

export default memo(SettingsAboutVersion);
