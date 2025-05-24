import Logo from '@/assets/logo.png';
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
import { isProd, isDev, isLinux } from '@/utils';
export interface NavLink {
  title: string;
  href: string;
  icon?: React.ReactNode;
}

export interface NavigationSection {
  title: string;
  buttons: NavLink[];
}

export interface NavigationProps {
  primary: NavLink[];
  secondary?: NavLink[];
}

export default function SidebarNav() {
  const t = useI18n();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { sidecar } = useAppStore(useSelector(['sidecar']));

  const navigation: NavigationProps = {
    primary: [
      {
        icon: <FolderArchive className='size-4' />,
        title: t('nav.compression'),
        href: '/compression/classic',
      },
      {
        icon: <FolderSearch className='size-4' />,
        title: t('nav.watch'),
        href: '/compression/watch',
      },
    ],
    secondary: [],
  };

  const themes = [
    {
      value: Theme.Light,
      label: t('settings.general.theme.option.light'),
      icon: <Sun className='size-4' />,
    },
    {
      value: Theme.Dark,
      label: t('settings.general.theme.option.dark'),
      icon: <Moon className='size-4' />,
    },
    {
      value: Theme.System,
      label: t('settings.general.theme.option.system'),
      icon: <MonitorCog className='size-4' />,
    },
  ];

  const handleChangeTheme = async (value: Theme) => {
    setTheme(value);
  };

  return (
    <TooltipProvider delayDuration={500}>
      <div
        className={cn(
          'light:border-gray-200 flex h-screen w-[67px] flex-shrink-0 flex-col justify-between border-r bg-neutral-50 pb-4 dark:bg-neutral-800',
          !isLinux ? 'pt-12' : 'pt-4',
        )}
        data-tauri-drag-region={!isLinux}
      >
        <div className='flex flex-col items-center justify-center gap-2'>
          <img
            className={`h-10 w-10 cursor-pointer bg-transparent duration-700 [transform-style:preserve-3d] hover:[transform:rotateY(-180deg)]`}
            aria-hidden='true'
            src={Logo}
          />
          {navigation?.primary?.map((item) => <NavItem item={item} key={item.href} />)}
        </div>
        <div className='flex flex-col items-center justify-center gap-2'>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    className={cn(
                      'h-12 w-12 justify-start border-none outline-none dark:hover:bg-neutral-700/50',
                    )}
                  >
                    {theme === Theme.Light && <Sun className='size-4' />}
                    {theme === Theme.Dark && <Moon className='size-4' />}
                    {theme === Theme.System && <MonitorCog className='size-4' />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side='right'>{t('settings.general.theme.title')}</TooltipContent>
              </Tooltip>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start'>
              {themes.map((theme) => (
                <DropdownMenuItem key={theme.value} onClick={() => handleChangeTheme(theme.value)}>
                  <div className='flex items-center gap-2'>
                    {theme.icon}
                    {theme.label}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Tooltip>
            <TooltipTrigger>
              <Link to='/settings' title={t('nav.settings')} viewTransition>
                <div className='relative flex items-center justify-center'>
                  <div
                    className={clsx(
                      'absolute right-2 top-2 h-[6px] w-[6px] rounded-full',
                      (isProd && sidecar?.process && sidecar?.origin && sidecar?.spawning) ||
                        (isDev && sidecar?.origin)
                        ? 'bg-green-400'
                        : 'bg-red-400',
                    )}
                  ></div>
                  <Button
                    variant={location.pathname.startsWith('/settings') ? 'secondary' : 'ghost'}
                    className={cn(
                      'h-12 justify-start',
                      location.pathname.startsWith('/settings')
                        ? 'hover:bg-mute bg-neutral-200/60 dark:bg-neutral-700/50 dark:hover:bg-neutral-700/50'
                        : 'dark:hover:bg-neutral-700/50',
                    )}
                  >
                    <Settings className='size-4' />
                  </Button>
                </div>
              </Link>
            </TooltipTrigger>
            <TooltipContent side='right'>{t('nav.settings')}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

const NavItem = function NavItem({
  item,
  className,
  ...props
}: {
  item: NavLink;
  className?: string;
  onClick?: () => void;
}) {
  const location = useLocation();
  return (
    <Tooltip>
      <TooltipTrigger>
        <Link to={item.href} viewTransition {...props}>
          <Button
            variant={location.pathname.startsWith(item.href) ? 'secondary' : 'ghost'}
            className={cn(
              'h-12 justify-start',
              location.pathname.startsWith(item.href)
                ? 'hover:bg-mute bg-neutral-200/60 dark:bg-neutral-700/50 dark:hover:bg-neutral-700/50'
                : 'dark:hover:bg-neutral-700/50',
              className,
            )}
          >
            {item.icon}
          </Button>
        </Link>
      </TooltipTrigger>
      <TooltipContent side='right'>{item.title}</TooltipContent>
    </Tooltip>
  );
};
