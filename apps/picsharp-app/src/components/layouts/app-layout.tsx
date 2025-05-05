import SidebarNav from './sidebar-nav';
import ErrorBoundary from '../error-boundary';
import { Outlet } from 'react-router';
import { useEffect, useRef } from 'react';
import { emit, listen, UnlistenFn } from '@tauri-apps/api/event';
import { PageProgress, PageProgressRef } from '../fullscreen-progress';
import { isFunction } from 'radash';
import { parseOpenWithFiles } from '@/utils/launch';
import useAppStore from '@/store/app';
import useCompressionStore from '@/store/compression';
import { isValidArray } from '@/utils';
import { parsePaths } from '@/utils/fs';
import { VALID_IMAGE_EXTS } from '@/constants';
import { useNavigate } from '@/hooks/useNavigate';
import { confirm } from '@tauri-apps/plugin-dialog';
import { spawnWindow } from '@/utils/window';
import { useI18n } from '@/i18n';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { updateWatchHistory } from '@/pages/compression/watch-guide';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { isProd } from '@/utils';

// if (isProd) {
//   window.oncontextmenu = (e) => {
//     console.log('oncontextmenu', e);
//     e.preventDefault();
//   };
// }

export default function AppLayout() {
  const progressRef = useRef<PageProgressRef>(null);
  const navigate = useNavigate();
  const t = useI18n();

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
        switch (payload.mode) {
          case 'compress:compare':
            navigate('/image-compare');
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
        const result = await confirm(paths.join(','), {
          title: titles[mode],
          kind: 'info',
          cancelLabel: t('current_window'),
          okLabel: t('new_window'),
        });
        if (result) {
          spawnWindow({
            mode,
            paths,
          });
        }
        return result;
      }
      return false;
    }

    async function handleNsInspect() {
      unlistenNsCompress = await listen('ns_compress', async (event) => {
        if (getCurrentWebviewWindow().label !== 'main') return;
        const paths = event.payload as string[];
        const hasSpawned = await spawnNewWindow('ns_compress', paths);
        if (!hasSpawned) {
          process('ns_compress', paths);
        }
      });
      unlistenNsWatchAndCompress = await listen('ns_watch_and_compress', async (event) => {
        if (getCurrentWebviewWindow().label !== 'main') return;
        const paths = event.payload as string[];
        const hasSpawned = await spawnNewWindow('ns_watch_and_compress', paths);
        if (!hasSpawned) {
          process('ns_watch_and_compress', paths);
        }
      });
      emit('ready', getCurrentWebviewWindow().label);
    }

    const handleDeepLink = async () => {
      unlistenDeepLink = await onOpenUrl(async (urls) => {
        console.log('onOpenUrl', urls);
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
          }
        }
      });
    };

    let timer;
    if (getCurrentWebviewWindow().label === 'main') {
      handleNsInspect();
      useAppStore.getState().initSidecar();
      timer = setInterval(() => {
        useAppStore.getState().startSidecarHeartbeat();
      }, 10000);
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

  return (
    <div className='flex h-screen w-screen bg-background'>
      <PageProgress ref={progressRef} />
      {getCurrentWebviewWindow().label === 'main' && <SidebarNav />}
      <div className='h-screen flex-1 bg-background bg-gradient-to-b from-blue-50 to-white dark:bg-background dark:bg-none'>
        <ErrorBoundary>
          <main className='relative h-full overflow-hidden'>
            <div
              data-tauri-drag-region='true'
              className='draggable absolute left-0 top-0 z-50 h-6 w-full select-none'
            ></div>
            <div className='h-full'>
              <Outlet />
            </div>
          </main>
        </ErrorBoundary>
      </div>
    </div>
  );
}
