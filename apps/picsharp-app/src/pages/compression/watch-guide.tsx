import { open } from '@tauri-apps/plugin-dialog';
import useSelector from '@/hooks/useSelector';
import { FolderOpen, FolderClock } from 'lucide-react';
import useCompressionStore from '../../store/compression';
import { useNavigate } from '@/hooks/useNavigate';
import { useI18n } from '../../i18n';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { useEffect, useState, useContext } from 'react';
import { isValidArray } from '@/utils';
import { Empty } from 'antd';
import { exists } from '@tauri-apps/plugin-fs';
import { basename } from '@tauri-apps/api/path';
import { Button } from '@/components/ui/button';
import useSettingsStore from '@/store/settings';
import { CompressionOutputMode } from '@/constants';
import { Badge } from '@/components/ui/badge';
import { CompressionContext } from '.';
import useAppStore from '@/store/app';
import { AppContext } from '@/routes';

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

  const handleWatch = async () => {
    const { sidecar } = useAppStore.getState();
    if (!sidecar?.origin) {
      messageApi?.error(t('tips.file_watch_not_running'));
      return;
    }
    const path = await open({
      directory: true,
      multiple: false,
    });
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
    const history = localStorage.getItem(WATCH_HISTORY_KEY);
    const arr = JSON.parse(history || '[]');
    if (isValidArray(arr)) {
      setHistory(arr);
    }
  }, []);

  return (
    <div className='relative flex min-h-screen flex-col items-center justify-center p-6'>
      <div className='relative z-10 text-center'>
        {/* <h1 className='dark:text-foreground mb-6 text-3xl font-bold'>
          {' '}
          ✨{t('page.compression.watch.guide.title')}✨
        </h1> */}
        <p className='mx-auto max-w-2xl text-lg'>{t('page.compression.watch.guide.description')}</p>
      </div>
      <div className='relative z-10 w-full max-w-5xl'>
        <div className='flex flex-col gap-8 md:flex-row'>
          <div className='flex-1'>
            <div className='group relative flex flex-col items-center justify-center gap-6 p-8'>
              <div className='text-center'>
                {/* 上传按钮 */}
                <div className='flex flex-col items-center justify-center gap-3 sm:flex-row'>
                  <Button onClick={handleWatch} className='flex items-center justify-center gap-2'>
                    <FolderOpen size={18} />
                    {t('page.compression.watch.guide.folder')}
                  </Button>
                  <Select defaultValue='' onValueChange={handleHistorySelect}>
                    <SelectTrigger className='w-[max-content]'>
                      <div className='flex items-center justify-center gap-2 transition-colors'>
                        <FolderClock size={18} />
                        {t('page.compression.watch.guide.history')}
                      </div>
                    </SelectTrigger>
                    <SelectContent className='max-h-[260px] overflow-y-auto'>
                      {isValidArray(history) ? (
                        <SelectGroup>
                          {history.map((item) => (
                            <SelectItem key={item.path} value={item.path} title={item.path}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ) : (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('no_data')} />
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 支持的格式展示 */}
              <div className='mt-2 text-center'>
                <p className='dark:text-foreground mb-2 text-sm text-slate-500'>
                  {t('page.compression.classic.tinypng_supported_formats')}
                </p>
                <div className='flex flex-wrap justify-center gap-2'>
                  {['PNG/Animated PNG', 'JPEG', 'WebP', 'AVIF'].map((format) => (
                    <Badge key={format} variant='minor' className='font-normal'>
                      {format}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className='mt-2 text-center'>
                <p className='dark:text-foreground mb-2 text-sm text-slate-500'>
                  {t('page.compression.classic.local_supported_formats')}
                </p>
                <div className='flex flex-wrap justify-center gap-2'>
                  {['PNG', 'JPEG', 'WebP/Animated WebP', 'AVIF', 'TIFF', 'GIF', 'SVG'].map(
                    (format) => (
                      <Badge key={format} variant='minor' className='font-normal'>
                        {format}
                      </Badge>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WatchCompressionGuide;
