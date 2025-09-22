import { Card } from '@/components/ui/card';
import Autostart from './autostart';
import Language from './language';
import Notification from './notification';
import Section from '../section';
import Update from './update';
import { isMac } from '@/utils';
import Privacy from './privacy';
import { useEffect } from 'react';
import { useReport } from '@/hooks/useReport';
import useSettingsStore from '@/store/settings';
export default function SettingsGeneral() {
  const r = useReport();

  useEffect(() => {
    const state = useSettingsStore.getState();
    r('settings_general_imp', {
      autostart: state.autostart,
      auto_check_update: state.auto_check_update,
      language: state.language,
    });
  }, []);

  return (
    <Section>
      <Card>
        <Language />
        <Notification />
        <Autostart />
        <Update />
        {/* <Privacy /> */}
      </Card>
    </Section>
  );
}
