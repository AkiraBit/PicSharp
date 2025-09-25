import ErrorBoundary from '../error-boundary';
import { Outlet } from 'react-router';
import { useEffect, useRef, useLayoutEffect, useContext } from 'react';
import { emit, UnlistenFn } from '@tauri-apps/api/event';
import { PageProgress, PageProgressRef } from '../fullscreen-progress';
import { isFunction } from 'radash';
import { parseOpenWithFiles } from '@/utils/launch';
import useAppStore from '@/store/app';
import useCompressionStore from '@/store/compression';
import useSettingsStore from '@/store/settings';
import { isValidArray, isProd, isLinux, isMac } from '@/utils';
import { parsePaths } from '@/utils/fs';
import { VALID_IMAGE_EXTS, SettingsKey } from '@/constants';
import { useNavigate } from '@/hooks/useNavigate';
import { spawnWindow } from '@/utils/window';
import { useI18n } from '@/i18n';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { updateWatchHistory } from '@/pages/compression/watch-guide';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import checkForUpdate from '@/utils/updater';
import { useAsyncEffect } from 'ahooks';
import { AppContext } from '@/routes';
import Header from './header';
import { cn } from '@/lib/utils';
import message from '@/components/message';
import { PathTagsInput } from '../path-tags-input';
import { TooltipProvider } from '../ui/tooltip';
import { useTrafficLightStore } from '@/store/trafficLight';
import { useReport } from '@/hooks/useReport';

if (isProd) {
  window.oncontextmenu = (e) => {
    e.preventDefault();
  };
}

export default function AppLayout() {
  const progressRef = useRef<PageProgressRef>(null);
  const navigate = useNavigate();
  const t = useI18n();
  const { messageApi } = useContext(AppContext);
  const r = useReport();

  useEffect(() => {
    let unlistenNsCompress: UnlistenFn | null = null;
    let unlistenNsWatchAndCompress: UnlistenFn | null = null;
    let unlistenDeepLink: UnlistenFn | null = null;

    async function process(mode: string, paths: string[]) {
      if (isValidArray(paths)) {
        progressRef.current?.show(true);
        const { setWorking, setFiles, setWatchingFolder, reset } = useCompressionStore.getState();
        reset();
        if (mode === 'ns_compress') {
          const fileInfos = await parsePaths(paths, VALID_IMAGE_EXTS);
          setWorking(true);
          setFiles(fileInfos);
          navigate('/compression/classic/workspace');
        } else if (mode === 'ns_watch_and_compress') {
          await updateWatchHistory(paths[0]);
          setWatchingFolder(paths[0]);
          setWorking(true);
          navigate('/compression/watch/workspace');
        }
        setTimeout(() => {
          progressRef.current?.done();
        }, 100);
      }
    }

    async function handleOpenWithFiles() {
      const payload = parseOpenWithFiles();
      if (payload) {
        r('open_with_files', {
          mode: payload.mode,
          paths: payload.paths,
        });
        switch (payload.mode) {
          case 'compress:compare':
            // navigate('/image-compare');
            break;
          default:
            process(payload.mode, payload.paths);
            break;
        }
      }
    }

    async function spawnNewWindow(mode: string, paths: string[]) {
      const titles = {
        ns_compress: t('ns_compress'),
        ns_watch_and_compress: t('ns_watch_and_compress'),
      };
      const { working } = useCompressionStore.getState();
      if (working) {
        const result = await message.confirm({
          title: titles[mode],
          description: (
            <TooltipProvider>
              <PathTagsInput
                value={paths}
                disabled
                className='h-[150px] border-neutral-200 dark:border-neutral-700/70'
              />
            </TooltipProvider>
          ),
          confirmText: t('new_window'),
          cancelText: t('current_window'),
        });
        if (result) {
          spawnWindow(
            {
              mode,
              paths,
            },
            {
              width: 917,
              height: 600,
            },
          );
        }
        return result;
      }
      return false;
    }

    async function handleNsInspect() {
      const currentWindow = WebviewWindow.getCurrent();
      unlistenNsCompress = await currentWindow.listen('ns_compress', async (event) => {
        r('ns_compress');
        if (currentWindow.label !== 'main') return;
        const paths = event.payload as string[];
        const hasSpawned = await spawnNewWindow('ns_compress', paths);
        if (!hasSpawned) {
          currentWindow.show();
          currentWindow.setFocus();
          process('ns_compress', paths);
        }
      });
      unlistenNsWatchAndCompress = await currentWindow.listen(
        'ns_watch_and_compress',
        async (event) => {
          r('ns_watch_and_compress');
          if (currentWindow.label !== 'main') return;
          const paths = event.payload as string[];
          const hasSpawned = await spawnNewWindow('ns_watch_and_compress', paths);
          if (!hasSpawned) {
            currentWindow.show();
            currentWindow.setFocus();
            process('ns_watch_and_compress', paths);
          }
        },
      );
      emit('ready', currentWindow.label);
    }

    const handleDeepLink = async () => {
      unlistenDeepLink = await onOpenUrl(async (urls) => {
        if (isValidArray(urls)) {
          const urlObj = new URL(urls[0]);
          if (urlObj.protocol === 'picsharp:') {
            const files = urlObj.searchParams.get('files')?.split(',') || [];
            if (!isValidArray(files)) return;
            switch (urlObj.hostname) {
              case 'compress':
                {
                  const hasSpawned = await spawnNewWindow('ns_compress', files);
                  if (!hasSpawned) {
                    process('ns_compress', files);
                  }
                }
                break;
              case 'watch':
                {
                  const hasSpawned = await spawnNewWindow('ns_watch_and_compress', files);
                  if (!hasSpawned) {
                    process('ns_watch_and_compress', files);
                  }
                }
                break;
              default:
                break;
            }
          } else if (urlObj.protocol === 'file:') {
            const files = urls.map((url) => decodeURIComponent(url.replace('file://', '')));
            if (isValidArray(files)) {
              const hasSpawned = await spawnNewWindow('ns_compress', files);
              if (!hasSpawned) {
                process('ns_compress', files);
              }
            }
          }
        }
      });
    };

    let timer;
    useAppStore.getState().initAppPath();
    if (WebviewWindow.getCurrent().label === 'main') {
      useAppStore.getState().initSidecar();
      if (!isProd) {
        timer = setInterval(() => {
          useAppStore.getState().pingSidecar();
        }, 10000);
      }
      if (isProd && useSettingsStore.getState()?.[SettingsKey.AutoCheckUpdate]) {
        checkForUpdate();
      }
      handleNsInspect();
    }
    handleOpenWithFiles();
    handleDeepLink();

    return () => {
      clearInterval(timer);
      isFunction(unlistenNsCompress) && unlistenNsCompress();
      isFunction(unlistenNsWatchAndCompress) && unlistenNsWatchAndCompress();
      isFunction(unlistenDeepLink) && unlistenDeepLink();
    };
  }, []);

  useAsyncEffect(async () => {
    const version = window.localStorage.getItem('updated_relaunch');
    if (version) {
      await WebviewWindow.getCurrent().show();
      await WebviewWindow.getCurrent().setFocus();
      window.localStorage.removeItem('updated_relaunch');
      messageApi?.success(t('update.successful', { version }));
    }
  }, []);

  useEffect(() => {
    if (!isMac) return;
    const {
      initializeTrafficLightListeners,
      setTrafficLightVisibility,
      cleanupTrafficLightListeners,
    } = useTrafficLightStore.getState();

    initializeTrafficLightListeners();
    setTrafficLightVisibility(true);
    return () => {
      cleanupTrafficLightListeners();
    };
  }, []);

  return (
    <ErrorBoundary>
      <div className='relative h-screen w-screen dark:bg-[#222222]'>
        <div
          className='absolute inset-0 z-0'
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(226, 232, 240, 0.15), transparent 70%), #000000',
          }}
        />
        <PageProgress ref={progressRef} description={t('tips.import_files')} />
        <Header />
        <div
          className={cn(
            'select-none overflow-hidden rounded-t-xl dark:bg-[#181818]',
            WebviewWindow.getCurrent().label === 'main' ||
              (WebviewWindow.getCurrent().label !== 'main' &&
                (location.pathname.startsWith('/compression/watch') ||
                  location.pathname.startsWith('/compression/classic')))
              ? 'h-[calc(100%-48px)]'
              : 'h-full',
          )}
        >
          <main className='relative h-full overflow-hidden'>
            <Outlet />
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}
