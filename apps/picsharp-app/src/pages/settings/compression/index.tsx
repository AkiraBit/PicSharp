import { Separator } from '@/components/ui/separator';
import { SettingsHeader } from '../header';
import TinyPng from './tinypng';
import TaskConfig from './task-config';
import Metadata from './metadata';
import { useI18n } from '@/i18n';
import Action from './action';
import LocalConfig from './local-config';
export default function SettingsCompression() {
  const t = useI18n();
  return (
    <div className='h-full space-y-6 overflow-auto px-6 pb-6'>
      <SettingsHeader
        heading={t('settings.compression.title')}
        text={t('settings.compression.description')}
      />
      <Separator />
      <Action />
      <TinyPng />
      <LocalConfig />
      <TaskConfig />
      {/* <Metadata /> */}
    </div>
  );
}
