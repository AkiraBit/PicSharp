import { PropsWithChildren, ReactNode } from 'react';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type SettingItemProps = PropsWithChildren<{
  id?: string;
  className?: string;
  title: ReactNode;
  titleClassName?: string;
  description?: ReactNode;
  descriptionClassName?: string;
}>;

function SettingItem({
  id,
  title,
  description,
  children,
  className,
  titleClassName,
  descriptionClassName,
}: SettingItemProps) {
  return (
    <CardHeader
      id={id}
      className={cn('flex flex-row items-center justify-between gap-x-8', className)}
    >
      <div className='grid gap-1'>
        <CardTitle className={cn('text-md font-medium', titleClassName)}>{title}</CardTitle>
        {description && (
          <CardDescription className={cn('text-sm', descriptionClassName)}>
            {description}
          </CardDescription>
        )}
      </div>
      <div className='flex min-w-[160px] items-center justify-end'>{children}</div>
    </CardHeader>
  );
}

export default SettingItem;
