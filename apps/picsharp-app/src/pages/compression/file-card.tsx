import { memo, useEffect, useRef } from 'react';
import ImgTag from '@/components/img-tag';
import { openPath, revealItemInDir } from '@tauri-apps/plugin-opener';
import useCompressionStore from '@/store/compression';
import useSelector from '@/hooks/useSelector';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n';
import { useUpdate } from 'ahooks';
import { exists } from '@tauri-apps/plugin-fs';
import { Menu, MenuItem } from '@tauri-apps/api/menu';
import { getOSPlatform, isValidArray } from '@/utils';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { RefreshCw } from 'lucide-react';
import { calImageWindowSize, spawnWindow } from '@/utils/window';
import { getAllWebviewWindows } from '@tauri-apps/api/webviewWindow';
import { ICompressor } from '@/utils/compressor';
import { undoSave } from '@/utils/fs';
import { Divider, Tooltip } from 'antd';
export interface FileCardProps {
  path: FileInfo['path'];
}

const handleOpenConvertFile = (event: React.MouseEvent<HTMLDivElement>) => {
  const src = event.currentTarget.dataset.src;
  if (src) {
    revealItemInDir(src);
  }
};

function FileCard(props: FileCardProps) {
  const { path } = props;
  const update = useUpdate();
  const t = useI18n();
  const { eventEmitter, fileMap } = useCompressionStore(useSelector(['eventEmitter', 'fileMap']));
  const file = fileMap.get(path);
  const imgRef = useRef<HTMLImageElement>(null);

  const fileContextMenuHandler = async (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const FILE_REVEAL_LABELS = {
      macos: t('compression.file_action.reveal_in_finder'),
      windows: t('compression.file_action.reveal_in_exploer'),
      linux: t('compression.file_action.reveal_in_exploer'),
      default: t('compression.file_action.reveal_in_exploer'),
    };
    const osPlatform = getOSPlatform();
    const fileRevealLabel = FILE_REVEAL_LABELS[osPlatform] || FILE_REVEAL_LABELS.default;
    const compareMenuItem = await MenuItem.new({
      text: t('compression.file_action.compare_file'),
      action: async () => {
        try {
          if (imgRef.current) {
            const imageBitmap = await window.createImageBitmap(imgRef.current);
            const [width, height] = calImageWindowSize(imageBitmap.width, imageBitmap.height);
            imageBitmap.close();
            const label = `PicSharp-${file.id}`;
            const windows = await getAllWebviewWindows();
            const targetWindow = windows.find((w) => w.label === label);
            if (targetWindow) {
              targetWindow.show();
            } else {
              spawnWindow(
                {
                  mode: 'compress:compare',
                  file,
                },
                {
                  label,
                  title: `Compare ${file.name}`,
                  width,
                  height,
                  resizable: false,
                  hiddenTitle: true,
                },
              );
            }
          }
        } catch (err) {
          console.error('image compare error', err);
        }
      },
    });
    const openFileMenuItem = await MenuItem.new({
      text: t('compression.file_action.open_file'),
      action: async () => {
        let path = file.status === ICompressor.Status.Completed ? file.outputPath : file.path;
        if (await exists(path)) {
          openPath(path);
        } else {
          toast.error(t('tips.file_not_exists'));
        }
      },
    });
    const revealMenuItem = await MenuItem.new({
      text: fileRevealLabel,
      action: async () => {
        let path = file.status === ICompressor.Status.Completed ? file.outputPath : file.path;
        if (await exists(path)) {
          revealItemInDir(path);
        } else {
          toast.error(t('tips.file_not_exists'));
        }
      },
    });
    const copyPathMenuItem = await MenuItem.new({
      text: t('compression.file_action.copy_path'),
      action: async () => {
        let path = file.status === ICompressor.Status.Completed ? file.outputPath : file.path;
        await writeText(path);
        toast.success(t('tips.file_path_copied'));
      },
    });
    const copyFileMenuItem = await MenuItem.new({
      text: t('compression.file_action.copy_file'),
      action: async () => {
        let path = file.status === ICompressor.Status.Completed ? file.outputPath : file.path;
        await invoke('ipc_copy_image', { path });
        toast.success(t('tips.file_copied'));
      },
    });
    const undoMenuItem = await MenuItem.new({
      text: t('compression.file_action.undo'),
      action: async () => {
        const { success, message } = await undoSave(file);
        if (success) {
          file.status = ICompressor.Status.Undone;
          file.compressRate = '';
          file.compressedBytesSize = 0;
          file.compressedDiskSize = 0;
          file.formattedCompressedBytesSize = '';
          file.assetPath = convertFileSrc(file.path);
          file.outputPath = '';
          file.originalTempPath = '';
          file.saveType = null;
          update();
          toast.success(t(message as any), {
            richColors: true,
          });
        } else {
          toast.error(t(message as any), {
            richColors: true,
          });
        }
      },
    });
    const menu = await Menu.new();

    if (
      file.status === ICompressor.Status.Completed &&
      file.outputPath &&
      file.originalTempPath &&
      imgRef.current
    ) {
      menu.append(compareMenuItem);
    }
    if (file.status === ICompressor.Status.Completed && file.outputPath && file.originalTempPath) {
      menu.append(undoMenuItem);
    }
    menu.append(openFileMenuItem);
    menu.append(revealMenuItem);
    menu.append(copyPathMenuItem);
    menu.append(copyFileMenuItem);
    menu.popup();
  };

  useEffect(() => {
    const updateFn = (signal: FileInfo['path'] | 'all') => {
      if (signal === path || signal === 'all') {
        update();
      }
    };
    eventEmitter.on('update_file_item', updateFn);
    return () => {
      eventEmitter.off('update_file_item', updateFn);
    };
  }, [path]);

  if (!file) return null;

  return (
    <div
      className='bg-background group relative overflow-hidden rounded-lg border transition-all duration-300 hover:shadow-lg dark:border-neutral-700'
      onContextMenu={fileContextMenuHandler}
    >
      <div className='relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-neutral-200/30 p-2 dark:bg-neutral-700/30'>
        <StatusBadge status={file.status} errorMessage={file.errorMessage} />
        <div className='absolute bottom-2 left-2'>
          <ImgTag type={file.ext} />
        </div>
        <img
          src={file.assetPath}
          alt={file.name}
          className='aspect-[4/3] object-contain'
          loading='lazy'
          ref={imgRef}
        />
      </div>
      <div className='p-2'>
        <Tooltip title={file.path} arrow={false}>
          <h3 className='text-foreground max-w-[100%] overflow-hidden text-ellipsis whitespace-nowrap font-medium'>
            {file.name}
          </h3>
        </Tooltip>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-1'>
            <span
              className={cn(
                'text-[12px] text-gray-500',
                file.status === ICompressor.Status.Completed &&
                  file.compressedBytesSize &&
                  'line-through',
              )}
            >
              {file.formattedBytesSize}
            </span>
            {file.status === ICompressor.Status.Completed && file.compressedBytesSize && (
              <span className='text-[12px] text-gray-500'>{file.formattedCompressedBytesSize}</span>
            )}
          </div>
          {file.status === ICompressor.Status.Completed && file.compressRate && (
            <div className='flex items-center gap-1'>
              <span
                className={cn(
                  'text-[12px] font-bold text-gray-500',
                  file.compressedBytesSize <= file.bytesSize ? 'text-green-500' : 'text-red-500',
                )}
              >
                {file.compressedBytesSize <= file.bytesSize
                  ? `-${file.compressRate}`
                  : `+${file.compressRate}`}
              </span>
            </div>
          )}
        </div>
        {isValidArray(file.convertResults) && (
          <>
            <Divider className='!my-0' plain>
              <span className='text-xs text-neutral-500'>
                {t('settings.compression.convert.title')}
              </span>
            </Divider>
            <div className='mt-1 flex items-center justify-center gap-1'>
              {file.convertResults.map((item) => (
                <Tooltip
                  title={item.success ? item.output_path : item.error_msg}
                  key={item.format}
                  arrow={false}
                >
                  <Badge
                    variant={item.success ? 'third' : 'destructive'}
                    className='cursor-pointer'
                    data-src={item.output_path}
                    onClick={handleOpenConvertFile}
                  >
                    <span className='uppercase'>{item.format}</span>
                  </Badge>
                </Tooltip>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default memo(FileCard);

const StatusBadge = ({ status, errorMessage }: Pick<FileInfo, 'status' | 'errorMessage'>) => {
  const t = useI18n();
  return (
    <div className='absolute right-2 top-1'>
      {status === ICompressor.Status.Processing && (
        <Badge variant='processing'>
          <RefreshCw className='mr-1 h-3 w-3 animate-spin' />
          {t('processing')}
        </Badge>
      )}
      {status === ICompressor.Status.Failed && (
        <Tooltip title={errorMessage} arrow={false}>
          <Badge variant='error'>{t('failed')}</Badge>
        </Tooltip>
      )}
      {status === ICompressor.Status.Completed && <Badge variant='success'>{t('saved')}</Badge>}
      {status === ICompressor.Status.Undone && <Badge variant='gray'>{t('undo.undone')}</Badge>}
    </div>
  );
};
