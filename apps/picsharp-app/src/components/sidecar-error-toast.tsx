import { toast as sonnerToast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';
import { X } from 'lucide-react';

interface ToastProps {
  id: string | number;
  description: string;
}

export function toast(toast: Omit<ToastProps, 'id'>) {
  return sonnerToast.custom((id) => <Toast id={id} description={toast.description} />, {
    duration: Infinity,
    richColors: true,
    closeButton: true,
    position: 'top-right',
  });
}

function Toast(props: ToastProps) {
  const { description, id } = props;
  const t = useI18n();
  return (
    <div className='relative flex w-full items-center rounded-lg bg-red-900 p-4 shadow-lg ring-1 ring-black/5 md:max-w-[364px]'>
      <div
        className='absolute -left-2 -top-2 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-neutral-900 duration-150 hover:scale-110 dark:bg-neutral-100'
        onClick={() => sonnerToast.dismiss(id)}
      >
        <X className='h-3 w-3 text-neutral-100 dark:text-neutral-900' />
      </div>
      <div className='flex flex-1 items-center'>
        <div className='w-full'>
          <p className='text-foreground text-sm font-medium'>{t('tips.service_startup_failed')}</p>
          <p className='text-muted-foreground mt-1 text-sm'>{description}</p>
        </div>
      </div>
      <div className='focus:outline-hidden ml-5 shrink-0 rounded-md text-sm font-medium focus:ring-offset-2'>
        <a href='https://github.com/AkiraBit/PicSharp/issues' target='_blank'>
          <Button size='sm' variant='default' className='px-1 py-1'>
            <span className='text-[12px]'>{t('menu.report_issue')}</span>
          </Button>
        </a>
      </div>
    </div>
  );
}
