import { Outlet } from 'react-router';
import { Separator } from '@/components/ui/separator';
import { SidebarNav } from './sidebar-nav';
import { Settings2, FileArchive, ListRestart } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Button, buttonVariants } from '@/components/ui/button';
import useSettingsStore from '@/store/settings';
import useSelector from '@/hooks/useSelector';
import { sleep } from '@/utils';
import { toast } from 'sonner';
import { showAlertDialog } from '@/components/ui/alert-dialog';

export default function SettingsLayout() {
  const t = useI18n();
  const { reset } = useSettingsStore(useSelector(['reset']));

  const sidebarNavItems = [
    {
      title: t('general'),
      href: '/settings/general',
      icon: <Settings2 />,
    },
    {
      title: t('compression'),
      href: '/settings/compression',
      icon: <FileArchive />,
    },
  ];

  const handleReset = () => {
    showAlertDialog({
      title: t('settings.reset_all'),
      description: t('settings.reset_all_confirm'),
      cancelText: t('cancel'),
      okText: t('confirm'),
      onConfirm: async () => {
        await sleep(1000);
        await reset();
        toast.success(t('tips.settings_reset_success'));
      },
    });
  };

  return (
    <div className='flex h-full flex-col pt-6'>
      <div className='flex items-center justify-between gap-x-8 space-y-0.5 px-6'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>{t('settings')}</h2>
          <p className='text-muted-foreground'>{t('settings.description')}</p>
        </div>
        <div className='flex items-center gap-x-2'>
          <Button variant='default' size='sm' onClick={handleReset}>
            <ListRestart className='h-5 w-5' />
            {t('settings.reset_all')}
          </Button>
        </div>
      </div>
      <Separator className='my-6' />
      <div className='flex flex-1 flex-col space-y-8 overflow-auto lg:flex-row lg:space-y-0'>
        <aside className='px-6 lg:w-1/6'>
          <SidebarNav items={sidebarNavItems} />
        </aside>
        <div className='mx-0 w-full flex-1'>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
