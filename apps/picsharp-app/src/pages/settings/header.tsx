import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
interface SettingsHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  className?: string;
  children?: ReactNode;
}
export default function SettingsHeader({
  title,
  description,
  className,
  children,
}: SettingsHeaderProps) {
  return (
    <header className={cn('flex items-center justify-between', className)}>
      <div className='grid gap-1'>
        <h1 className='font-heading text-xl font-bold'>{title}</h1>
        {description && <p className='text-md text-muted-foreground'>{description}</p>}
      </div>
      <div className='flex items-center gap-x-1'>{children}</div>
    </header>
  );
}
