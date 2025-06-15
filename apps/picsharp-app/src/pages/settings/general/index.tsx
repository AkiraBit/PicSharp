import { Card } from '@/components/ui/card';
import Autostart from './autostart';
import Language from './language';
import Notification from './notification';
import Section from '../section';
import Update from './update';
import { isMac } from '@/utils';
export default function SettingsGeneral() {
  return (
    <Section>
      <Card>
        <Language />
        <Notification />
        {/* <Autostart /> */}
        <Update />
      </Card>
    </Section>
  );
}
