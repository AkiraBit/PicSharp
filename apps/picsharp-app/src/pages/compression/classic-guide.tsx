import { useEffect, useRef, useContext } from 'react';
import { UnlistenFn } from '@tauri-apps/api/event';
import { isFunction } from 'radash';
import { open } from '@tauri-apps/plugin-dialog';
import { parsePaths } from '../../utils/fs';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { Folder, Upload } from 'lucide-react';
import useCompressionStore from '../../store/compression';
import { CompressionContext } from '.';
import { isValidArray, sleep } from '@/utils';
import { useNavigate } from '@/hooks/useNavigate';
import { VALID_IMAGE_EXTS } from '@/constants';
import { useI18n } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import message from '@/components/message';
import { Menu, MenuItem } from '@tauri-apps/api/menu';
import { parseClipboardImages } from '@/utils/clipboard';
import { downloadDir } from '@tauri-apps/api/path';
import { AppContext } from '@/routes';

function ClassicCompressionGuide() {
  const { progressRef } = useContext(CompressionContext);
  const dragDropController = useRef<UnlistenFn | null>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const t = useI18n();
  const { messageApi } = useContext(AppContext);

  const handleFiles = async (paths: string[] | null) => {
    if (!isValidArray(paths)) return;
    progressRef.current?.show(true);
    const files = await parsePaths(paths!, VALID_IMAGE_EXTS);
    if (!isValidArray(files)) {
      progressRef.current?.done();
      message.info({
        title: t('common.no_image_to_compress'),
      });
      return;
    }
    useCompressionStore.getState().setWorking(true);
    useCompressionStore.getState().setFiles(files);
    navigate('/compression/classic/workspace');
    setTimeout(() => {
      progressRef.current?.done();
    }, 100);
  };

  const handleSelectFile = async () => {
    const files = await open({
      multiple: true,
      directory: false,
      filters: [
        {
          name: 'Image Files',
          extensions: VALID_IMAGE_EXTS,
        },
      ],
    });
    handleFiles(files);
  };

  const handleSelectDirectory = async () => {
    const directory = await open({
      multiple: true,
      directory: true,
      recursive: true,
    });

    if (directory) {
      handleFiles(Array.isArray(directory) ? directory : [directory]);
    }
  };

  // const handleContextMenu = async (event: React.MouseEvent<HTMLDivElement>) => {
  //   event.preventDefault();
  //   const menu = await Menu.new();
  //   const menuItem = await MenuItem.new({
  //     text: 'Open',
  //     action: () => {
  //       console.log('open');
  //     },
  //   });
  //   await menu.append(menuItem);
  //   await menu.popup();
  // };

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
          handleFiles(event.payload.paths);
        }
      });
    };

    const handlePaste = async (event: ClipboardEvent) => {
      let messageKey = 'parse-clipboard-images';
      try {
        event.preventDefault();
        messageApi?.loading({
          key: messageKey,
          content: t('clipboard.parse_clipboard_images'),
        });
        let candidateFormat = 'png';
        if (event.clipboardData) {
          const items = Array.from(event.clipboardData.items);
          const hasImages = items.some(
            (item) => item.kind === 'file' && item.type.startsWith('image/'),
          );
          if (hasImages) {
            candidateFormat =
              items
                .find((item) => item.kind === 'file' && item.type.startsWith('image/'))
                ?.type.split('/')[1] || 'png';
          }
        }
        const tempDir = await downloadDir();
        const { success, paths, error } = await parseClipboardImages(candidateFormat, tempDir);
        if (success) {
          if (isValidArray(paths)) {
            handleFiles(paths as string[]);
          } else {
            messageApi?.info(t('clipboard.parse_clipboard_images_no_images'));
          }
        } else {
          messageApi?.error(
            t('clipboard.parse_clipboard_images_error', { error: error?.toString() }),
          );
        }
      } catch (error) {
        messageApi?.error(t('clipboard.parse_clipboard_images_error', { error: error.toString() }));
      } finally {
        messageApi?.destroy(messageKey);
      }
    };

    const setupPasteListener = () => {
      document.addEventListener('paste', handlePaste);
    };

    setupDragDrop();
    setupPasteListener();

    return () => {
      if (isFunction(dragDropController.current)) {
        dragDropController.current();
      }
      dragDropController.current = null;
      document.removeEventListener('paste', handlePaste);
    };
  }, []);

  return (
    <div
      ref={dropzoneRef}
      className='relative flex min-h-screen flex-col items-center justify-center p-6 transition-all duration-300 [&.drag-active]:from-indigo-50/50 [&.drag-active]:to-indigo-100/50'
    >
      <div className='relative text-center'>
        {/* <h1 className='dark:text-foreground mb-6 text-3xl font-bold'>✨PicSharp✨</h1> */}
        <p className='mx-auto max-w-2xl text-lg'>
          {t('page.compression.classic.upload_description')}
        </p>
      </div>

      <div className='relative w-full max-w-5xl'>
        <div className='flex flex-col gap-8 md:flex-row'>
          <div className='flex-1'>
            <div className='group relative flex flex-col items-center justify-center gap-6 p-8'>
              <div className='text-center'>
                <div className='flex flex-col items-center justify-center gap-3 sm:flex-row'>
                  <Button onClick={handleSelectFile}>
                    <Upload size={18} />
                    {t('page.compression.classic.upload_file')}
                  </Button>
                  <Button onClick={handleSelectDirectory}>
                    <Folder size={18} />
                    {t('page.compression.classic.upload_directory')}
                  </Button>
                </div>
              </div>

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

      <div className='pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-neutral-100/80 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 dark:bg-neutral-800/80 [.drag-active_&]:opacity-100'></div>
    </div>
  );
}

export default ClassicCompressionGuide;
