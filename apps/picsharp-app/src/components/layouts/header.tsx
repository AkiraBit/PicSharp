import { useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { Settings, FolderArchive, FolderSearch, Moon, Sun, MonitorCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useI18n } from '@/i18n';
import Link from '@/components/link';
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
import useCompressionStore from '@/store/compression';
import { Badge } from '@/components/ui/badge';
import { openPath } from '@tauri-apps/plugin-opener';
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
  const { working, watchingFolder } = useCompressionStore(
    useSelector(['working', 'watchingFolder']),
  );

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
      className={cn(
        'relative flex h-[48px] w-full flex-shrink-0 items-center',
        isMac ? 'px-[73px]' : 'px-2',
      )}
      data-tauri-drag-region
    >
      {working && watchingFolder && (
        <Badge
          variant='midnight'
          className='absolute left-1/2 z-[10] -translate-x-1/2 cursor-pointer text-nowrap transition-all duration-300 hover:underline'
          onClick={() => {
            openPath(watchingFolder);
          }}
        >
          <span className='max-w-[60vw] truncate'>{watchingFolder}</span>
        </Badge>
      )}
      <Tabs
        value={activeTab}
        className={cn(
          'absolute left-1/2 -translate-x-1/2 transition-all duration-300',
          working && cn(isMac ? 'left-[73px] -translate-x-0' : 'left-2 -translate-x-0'),
        )}
      >
        <TabsList className='dark:border-white/10 dark:bg-black/30'>
          {navigation.primary.map((item) => (
            <Link key={item.key} to={item.href}>
              <TabsTrigger
                value={item.key}
                className={cn(
                  'group flex select-none items-center justify-center',
                  !working && 'gap-2',
                )}
              >
                {item.icon}
                <div
                  className={cn(
                    working &&
                      'w-0 max-w-[max-content] overflow-hidden text-left transition-all duration-300 group-hover:ml-2 group-hover:w-[60px]',
                  )}
                >
                  {item.title}
                </div>
              </TabsTrigger>
            </Link>
          ))}
        </TabsList>
      </Tabs>
      <div className='absolute right-2 flex items-center gap-2'>
        <Tooltip>
          <TooltipTrigger>
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
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('nav.settings')}</p>
          </TooltipContent>
        </Tooltip>
        <WindowControl showControls={!isMac} showFullscreen={!isMac} />
      </div>
    </header>
  );
}

export default Header;
