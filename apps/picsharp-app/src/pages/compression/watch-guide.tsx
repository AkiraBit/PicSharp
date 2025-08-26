import { open } from '@tauri-apps/plugin-dialog';
import useSelector from '@/hooks/useSelector';
import { FolderClock, Plus, X } from 'lucide-react';
import useCompressionStore from '../../store/compression';
import { useNavigate } from '@/hooks/useNavigate';
import { useI18n } from '../../i18n';
import { useEffect, useState, useContext, useRef } from 'react';
import { isValidArray, stopPropagation } from '@/utils';
import { exists, stat } from '@tauri-apps/plugin-fs';
import { basename } from '@tauri-apps/api/path';
import { Button } from '@/components/ui/button';
import useSettingsStore from '@/store/settings';
import { CompressionOutputMode } from '@/constants';
import { Badge } from '@/components/ui/badge';
import { CompressionContext } from '.';
import useAppStore from '@/store/app';
import { AppContext } from '@/routes';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { UnlistenFn } from '@tauri-apps/api/event';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CircleHelpIcon } from 'lucide-react';
import Folder from '@/components/animated-icon/folder';
import { ScrollArea } from '@/components/ui/scroll-area';
import FormatsTips from './formats-tips';

const WATCH_HISTORY_KEY = 'compression_watch_history';

export const updateWatchHistory = async (path: string) => {
  const name = await basename(path);
  const historyStr = localStorage.getItem(WATCH_HISTORY_KEY) || '[]';
  const history = JSON.parse(historyStr);
  const targetIndex = history.findIndex((item) => item.path === path);
  if (targetIndex !== -1) {
    history.splice(targetIndex, 1);
  }
  const newHistory = [{ name, path }, ...history];
  localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(newHistory));
  return newHistory;
};

function WatchCompressionGuide() {
  const { progressRef } = useContext(CompressionContext);
  const [history, setHistory] = useState<Array<{ name: string; path: string }>>([]);
  const navigate = useNavigate();
  const { setWorking, setWatchingFolder } = useCompressionStore(
    useSelector(['setWorking', 'setWatchingFolder']),
  );
  const t = useI18n();
  const { messageApi } = useContext(AppContext);
  const dragDropController = useRef<UnlistenFn | null>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const handleWatch = async (path?: string) => {
    const { sidecar } = useAppStore.getState();
    if (!sidecar?.origin) {
      messageApi?.error(t('tips.file_watch_not_running'));
      return;
    }
    if (!path) {
      path = await open({
        directory: true,
        multiple: false,
      });
    }
    if (path) {
      if (!(await exists(path))) {
        messageApi?.error(t('tips.path_not_exists'));
        return;
      }
      const state = useSettingsStore.getState();
      if (
        state.compression_output === CompressionOutputMode.SaveToNewFolder &&
        state.compression_output_save_to_folder === path
      ) {
        messageApi?.error(t('tips.watch_and_save_same_folder'));
        return;
      }
      const newHistory = await updateWatchHistory(path);
      setHistory(newHistory);
      progressRef.current?.show(true);
      setWorking(true);
      setWatchingFolder(path);
      navigate(`/compression/watch/workspace`);
    }
  };

  const handleHistorySelect = async (path: string) => {
    const { sidecar } = useAppStore.getState();
    if (!sidecar?.origin) {
      messageApi?.error(t('tips.file_watch_not_running'));
      return;
    }
    const isExists = await exists(path);
    const targetIndex = history.findIndex((item) => item.path === path);
    if (isExists) {
      const state = useSettingsStore.getState();
      if (
        state.compression_output === CompressionOutputMode.SaveToNewFolder &&
        state.compression_output_save_to_folder === path
      ) {
        messageApi?.error(t('tips.watch_and_save_same_folder'));
        return;
      }
      if (targetIndex !== -1) {
        const name = history[targetIndex].name;
        history.splice(targetIndex, 1);
        const newHistory = [{ name, path }, ...history];
        localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(newHistory));
        setHistory(newHistory);
      }
      progressRef.current?.show(true);
      setWorking(true);
      setWatchingFolder(path);
      navigate(`/compression/watch/workspace`);
    } else {
      history.splice(targetIndex, 1);
      localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(history));
      setHistory([...history]);
      messageApi?.error(t('tips.file_not_exists'));
    }
  };

  useEffect(() => {
    const setupDragDrop = async () => {
      dragDropController.current = await getCurrentWebview().onDragDropEvent(async (event) => {
        if (!dropzoneRef.current) return;

        if (event.payload.type === 'enter') {
          dropzoneRef.current.classList.add('drag-active');
        } else if (event.payload.type === 'leave') {
          dropzoneRef.current.classList.remove('drag-active');
        } else if (event.payload.type === 'drop') {
          dropzoneRef.current.classList.remove('drag-active');
          const path = event.payload.paths[0];
          if (path) {
            const isDir = (await stat(path)).isDirectory;
            if (isDir) {
              handleWatch(path);
            } else {
              messageApi?.error(t('tips.path_not_dir', { path }));
            }
          }
        }
      });
    };
    const history = localStorage.getItem(WATCH_HISTORY_KEY);
    const arr = JSON.parse(history || '[]');
    if (isValidArray(arr)) {
      setHistory(arr);
    }
    setupDragDrop();
  }, []);

  return (
    <div
      ref={dropzoneRef}
      className='group relative flex h-full flex-col items-center justify-center p-6'
    >
      <div onClick={() => handleWatch()} className='cursor-pointer'>
        <Folder />
      </div>
      <div className='relative z-10 mt-5 text-center'>
        <p className='mx-auto max-w-2xl text-lg'>{t('page.compression.watch.guide.description')}</p>
      </div>
      <div className='relative z-10 mt-5 w-full max-w-5xl'>
        {isValidArray(history) ? (
          <div className='mx-auto max-w-xl'>
            <div className='mb-2 flex items-center justify-between gap-2 text-sm text-neutral-500'>
              <div className='flex items-center gap-2'>
                <FolderClock size={18} />
                {t('page.compression.watch.guide.history')} ({history.length})
              </div>
              <Button
                variant='ghost'
                size='sm'
                className='cursor-pointer text-neutral-400'
                onClick={() => handleWatch()}
              >
                <Plus size={18} />
                {t('page.compression.watch.guide.open_folder')}
              </Button>
            </div>
            <ScrollArea className='h-[220px] rounded-md border border-neutral-200 dark:border-neutral-800'>
              <ul className='max-w-xl divide-y divide-neutral-200 dark:divide-neutral-800'>
                {history.map((item) => (
                  <li
                    key={item.path}
                    className='flex cursor-pointer items-center justify-between gap-4 px-4 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                    data-path={item.path}
                    title={item.path}
                    onClick={() => handleHistorySelect(item.path)}
                  >
                    <span className='max-w-[50%] truncate font-medium'>{item.name}</span>
                    <div className='flex max-w-[50%] items-center gap-1'>
                      <span className='flex-1 truncate text-neutral-400'>{item.path}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        ) : (
          <div className='flex w-full items-center justify-center'>
            <Button
              variant='secondary'
              size='sm'
              className='cursor-pointer text-neutral-400'
              onClick={() => handleWatch()}
            >
              <Plus size={18} className='cursor-pointer' />
              {t('page.compression.watch.guide.open_folder')}
            </Button>
          </div>
        )}
      </div>
      <div className='absolute bottom-2 right-2' onClick={stopPropagation}>
        <FormatsTips />
      </div>
    </div>
  );
}

export default WatchCompressionGuide;
