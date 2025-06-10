import { Card } from '@/components/ui/card';
import Mode from './mode';
import Section from '../section';
import Output from './output';
import Threshold from './threshold';
import Type from './type';
import Level from './level';
import { useEffect, useRef } from 'react';
import Convert from './convert';
import Metadata from './metadata';

export default function SettingsCompression() {
  const outputElRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (outputElRef.current && hash === '#output') {
      setTimeout(() => {
        outputElRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        outputElRef.current.classList.add('breathe-highlight');
      }, 300);
    }
  }, []);

  return (
    <Section>
      <Card>
        <Mode />
        <Type />
        <Level />
        <Metadata />
      </Card>
      <Card ref={outputElRef}>
        <Output />
        <Threshold />
      </Card>
      <Card>
        <Convert />
      </Card>
    </Section>
  );
}
