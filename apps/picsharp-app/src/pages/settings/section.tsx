import { PropsWithChildren } from 'react';
import { cn } from '@/lib/utils';

export type SettingsSectionProps = PropsWithChildren<{
  className?: string;
}>;

function SettingsSection({ children, className }: SettingsSectionProps) {
  return (
    <section className={cn('h-full space-y-6 overflow-auto px-5 pb-5', className)}>
      {children}
    </section>
  );
}

export default SettingsSection;
