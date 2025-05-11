import { Card } from '@/components/ui/card';
import Mode from './mode';
import Section from '../section';
import Output from './output';
import Threshold from './threshold';
import Type from './type';
import Level from './level';
export default function SettingsCompression() {
  return (
    <Section>
      <Card>
        <Mode />
        <Type />
        <Level />
      </Card>
      <Card>
        <Output />
        <Threshold />
      </Card>
    </Section>
  );
}
