import { Card } from '@/components/ui/card';
import Metadata from './metadata';
import ApiKeys from './api-keys';
import Section from '../section';
import { memo, useEffect, useRef } from 'react';

export default memo(function SettingsTinypng() {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (elRef.current && hash === '#tinypng-api-keys') {
      setTimeout(() => {
        elRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        elRef.current.classList.add('breathe-highlight');
      }, 300);
    }
  }, []);

  return (
    <Section>
      <Card ref={elRef}>
        <ApiKeys />
        <Metadata />
      </Card>
    </Section>
  );
});
