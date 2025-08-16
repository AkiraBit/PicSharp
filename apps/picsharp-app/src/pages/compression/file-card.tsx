import { memo, useEffect, useRef, useContext } from 'react';
import { openPath, revealItemInDir } from '@tauri-apps/plugin-opener';
import useCompressionStore from '@/store/compression';
import useSelector from '@/hooks/useSelector';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n';
import { useUpdate } from 'ahooks';
import { exists } from '@tauri-apps/plugin-fs';
import { getOSPlatform, isValidArray } from '@/utils';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { RefreshCw } from 'lucide-react';
import { calImageWindowSize, spawnWindow } from '@/utils/window';
import { getAllWebviewWindows } from '@tauri-apps/api/webviewWindow';
import { ICompressor } from '@/utils/compressor';
import { undoSave } from '@/utils/fs';
import { Divider, Tooltip } from 'antd';
import { AppContext } from '@/routes';
import {
  ContextMenu,
  ImperativeContextMenuNode,
  ImperativeContextMenuItem,
} from '@/components/context-menu';
import ImageViewer, { ImageViewerRef } from '@/components/image-viewer';

export interface FileCardProps {
  path: FileInfo['path'];
}

function FileCard(props: FileCardProps) {
  const { path } = props;
  const update = useUpdate();
  const t = useI18n();
  const { eventEmitter, fileMap } = useCompressionStore(useSelector(['eventEmitter', 'fileMap']));
  const file = fileMap.get(path);
  const imgRef = useRef<ImageViewerRef>(null);
  const { messageApi } = useContext(AppContext);

  const handleRevealFile = async (event: React.MouseEvent<HTMLDivElement>) => {
    const src = event.currentTarget.dataset.src;
    if (src && (await exists(src))) {
      revealItemInDir(src);
    } else {
      messageApi?.error(t('tips.file_not_exists'));
    }
  };

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
    const menuItems: ImperativeContextMenuNode[] = [];
    const compareMenuItem: ImperativeContextMenuItem = {
      type: 'item',
      name: t('compression.file_action.compare_file'),
      onClick: async () => {
        try {
          if (imgRef.current) {
            const dimensions = imgRef.current.getSize();
            if (!dimensions) return;
            const [width, height] = calImageWindowSize(dimensions.width, dimensions.height);
            const label = `PicSharp_Compare_${file.id}`;
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
    };
    const openFileMenuItem: ImperativeContextMenuItem = {
      type: 'item',
      name: t('compression.file_action.open_file'),
      onClick: async () => {
        let path = file.status === ICompressor.Status.Completed ? file.outputPath : file.path;
        if (await exists(path)) {
          openPath(path);
        } else {
          messageApi?.error(t('tips.file_not_exists'));
        }
      },
    };
    const revealMenuItem: ImperativeContextMenuItem = {
      type: 'item',
      name: fileRevealLabel,
      onClick: async () => {
        let path = file.status === ICompressor.Status.Completed ? file.outputPath : file.path;
        if (await exists(path)) {
          revealItemInDir(path);
        } else {
          messageApi?.error(t('tips.file_not_exists'));
        }
      },
    };
    const copyPathMenuItem: ImperativeContextMenuItem = {
      type: 'item',
      name: t('compression.file_action.copy_path'),
      onClick: async () => {
        let path = file.status === ICompressor.Status.Completed ? file.outputPath : file.path;
        await writeText(path);
        messageApi?.success(t('tips.file_path_copied'));
      },
    };
    const copyFileMenuItem: ImperativeContextMenuItem = {
      type: 'item',
      name: t('compression.file_action.copy_file'),
      onClick: async () => {
        let path = file.status === ICompressor.Status.Completed ? file.outputPath : file.path;
        await invoke('ipc_copy_image', { path });
        messageApi?.success(t('tips.file_copied'));
      },
    };
    const copyAsMarkdownMenuItem: ImperativeContextMenuItem = {
      type: 'item',
      name: t('compression.file_action.copy_as_markdown'),
      onClick: async () => {
        let path = file.status === ICompressor.Status.Completed ? file.outputPath : file.path;
        await writeText(`![${file.name}](${path})`);
        messageApi?.success(t('tips.markdown_code_copied'));
      },
    };
    const undoMenuItem: ImperativeContextMenuItem = {
      type: 'item',
      name: t('compression.file_action.undo'),
      onClick: async () => {
        const { success, message: undoMessage } = await undoSave(file);
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
          messageApi?.success(t(undoMessage as any));
        } else {
          messageApi?.error(t(undoMessage as any));
        }
      },
    };

    if (
      file.status === ICompressor.Status.Completed &&
      file.outputPath &&
      file.originalTempPath &&
      imgRef.current
    ) {
      menuItems.push(compareMenuItem);
      menuItems.push({
        type: 'separator',
      });
    }
    if (file.status === ICompressor.Status.Completed && file.outputPath && file.originalTempPath) {
      menuItems.push(undoMenuItem);
      menuItems.push({
        type: 'separator',
      });
    }
    menuItems.push(openFileMenuItem);
    menuItems.push(revealMenuItem);
    menuItems.push({
      type: 'separator',
    });
    menuItems.push({
      type: 'item',
      name: t('compression.file_action.copy'),
      children: [copyPathMenuItem, copyFileMenuItem, copyAsMarkdownMenuItem],
    });
    ContextMenu.open({
      x: event.clientX,
      y: event.clientY,
      items: menuItems,
    });
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
      className='bg-background group relative rounded-lg border transition-all duration-300 hover:shadow-lg dark:border-neutral-700'
      onContextMenu={fileContextMenuHandler}
    >
      <div className='text-0 relative flex aspect-[4/3] items-center justify-center overflow-hidden p-1'>
        <StatusBadge status={file.status} errorMessage={file.errorMessage} />
        {/* <div className='absolute bottom-2 left-2'>
          <ImgTag type={file.ext} />
        </div> */}
        <div className='text-0 flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-md bg-neutral-200/30 dark:bg-neutral-700/70'>
          <ImageViewer
            src={file.assetPath}
            path={file.path}
            ext={file.ext}
            imgClassName='max-h-full object-contain transition-all duration-300 hover:scale-110'
          />
          {/* <img
            src={file.assetPath}
            alt={file.name}
            className='max-h-full object-contain transition-all duration-300 hover:scale-110'
            loading='lazy'
            ref={imgRef}
          /> */}
        </div>
      </div>
      <div className='px-2 pb-2'>
        <Tooltip title={file.path} arrow={false}>
          <div className='text-foreground text-md max-w-[100%] overflow-hidden text-ellipsis whitespace-nowrap font-normal'>
            {file.name.replace(`.${file.ext}`, '')}
          </div>
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
        {isValidArray(file.convertResults) && file.status === ICompressor.Status.Completed && (
          <>
            <Divider className='!my-0' plain>
              <span className='text-xs text-neutral-500'>
                {t('settings.compression.convert.title')}
              </span>
            </Divider>
            <div className='mt-1 flex items-center justify-center gap-1'>
              {file.convertResults.map((item) => (
                <Tooltip
                  title={
                    <span className='break-all'>
                      {item.success ? item.output_path : item.error_msg}
                    </span>
                  }
                  key={item.format}
                  arrow={false}
                >
                  <Badge
                    variant={item.success ? 'third-mini' : 'destructive'}
                    className='cursor-pointer'
                    data-src={item.output_path}
                    onClick={handleRevealFile}
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
    <div className='absolute right-2 top-1 z-10'>
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
