import { useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { Settings, FolderArchive, FolderSearch, Moon, Sun, MonitorCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useI18n } from '@/i18n';
import Link from '@/components/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme, Theme } from '@/components/theme-provider';
import useAppStore from '@/store/app';
import useSelector from '@/hooks/useSelector';
import clsx from 'clsx';
import { isProd, isDev, isLinux, isMac } from '@/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SettingsGearIcon } from '@/components/animated-icon/setting';
import { useNavigate } from '@/hooks/useNavigate';
import { useEffect, useMemo, useState } from 'react';
import WindowControl from '@/components/window-control';

export interface NavLink {
  title: string;
  href: string;
  key: string;
  icon?: React.ReactNode;
}

export interface NavigationProps {
  primary: NavLink[];
  secondary?: NavLink[];
}

function Header() {
  const t = useI18n();
  const { theme, setTheme } = useTheme();
  const { sidecar } = useAppStore(useSelector(['sidecar']));
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('compress');
  const navigation: NavigationProps = useMemo(
    () => ({
      primary: [
        {
          key: 'compress',
          icon: <FolderArchive className='size-4' />,
          title: t('nav.compression'),
          href: '/compression/classic',
        },
        {
          key: 'watch',
          icon: <FolderSearch className='size-4' />,
          title: t('nav.watch'),
          href: '/compression/watch',
        },
      ],
    }),
    [t],
  );

  useEffect(() => {
    const target = navigation.primary.find((item) => location.pathname.startsWith(item.href));
    if (target) {
      setActiveTab(target.key);
    }
  }, [location.pathname, navigation]);

  return (
    <header
      className='relative flex h-[48px] w-full flex-shrink-0 items-center justify-center dark:bg-[#222222]'
      data-tauri-drag-region={isMac}
    >
      <Tabs value={activeTab}>
        <TabsList className='dark:bg-[#181818]'>
          {navigation.primary.map((item) => (
            <Link key={item.key} to={item.href}>
              <TabsTrigger value={item.key}>{item.title}</TabsTrigger>
            </Link>
          ))}
        </TabsList>
      </Tabs>
      <div className='absolute right-2 flex items-center gap-2'>
        <Link to='/settings' title={t('nav.settings')} viewTransition>
          <div className='relative flex items-center justify-center'>
            <div
              className={clsx(
                'absolute right-1 top-1 h-[6px] w-[6px] rounded-full',
                (isProd && sidecar?.process && sidecar?.origin && sidecar?.spawning) ||
                  (isDev && sidecar?.origin)
                  ? 'bg-green-400'
                  : 'bg-red-400',
              )}
            ></div>
            <Button
              variant={location.pathname.startsWith('/settings') ? 'secondary' : 'ghost'}
              className={cn('flex h-9 w-9 items-center justify-center')}
            >
              <SettingsGearIcon size={32} />
            </Button>
          </div>
        </Link>
        <WindowControl showControls={!isMac} showFullscreen={!isMac} />
      </div>
    </header>
  );
}

export default Header;
