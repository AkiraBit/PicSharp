import { Outlet } from 'react-router';
import { Separator } from '@/components/ui/separator';
import { SidebarNav } from './sidebar-nav';
import { Settings2, FileArchive, ListRestart, Panda, Info } from 'lucide-react';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/button';
import useSettingsStore from '@/store/settings';
import useSelector from '@/hooks/useSelector';
import { sleep } from '@/utils';
import { toast } from 'sonner';
import { showAlertDialog } from '@/components/ui/alert-dialog';
import Header from './header';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function SettingsLayout() {
  const t = useI18n();
  const { reset } = useSettingsStore(useSelector(['reset']));

  const sidebarNavItems = [
    {
      title: t('settings.general.title'),
      href: '/settings/general',
      icon: <Settings2 />,
    },
    {
      title: t('settings.compression.title'),
      href: '/settings/compression',
      icon: <FileArchive />,
    },
    {
      title: t('settings.tinypng.title'),
      href: '/settings/tinypng',
      icon: <Panda />,
    },
    {
      title: t('settings.about.title'),
      href: '/settings/about',
      icon: <Info />,
    },
  ];

  const handleReset = () => {
    showAlertDialog({
      title: t('settings.reset_all_confirm'),
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
    <div className='flex h-full flex-col pt-5'>
      <Header title={t('settings.title')} description={t('settings.description')} className='px-5'>
        <Button variant='default' size='sm' onClick={handleReset}>
          <ListRestart className='h-5 w-5' />
          {t('settings.reset_all')}
        </Button>
      </Header>
      <Separator className='my-4' />
      <div className='flex flex-1 flex-col space-y-4 overflow-auto lg:flex-row lg:space-y-0'>
        <aside className='px-6 lg:w-1/6'>
          <SidebarNav items={sidebarNavItems} />
        </aside>
        <ScrollArea className='mx-0 w-full flex-1'>
          <Outlet />
        </ScrollArea>
      </div>
    </div>
  );
}
