import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n';
import { isMac, ssimToQualityScore } from '@/utils';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import WindowControl from '@/components/window-control';
import { useTrafficLightStore } from '@/store/trafficLight';
import useSelector from '@/hooks/useSelector';
import { UnlistenFn } from '@tauri-apps/api/event';
import ImageViewer from '@/components/image-viewer';
import { useReport } from '@/hooks/useReport';

export default function ImageCompare() {
  const [file, setFile] = useState<FileInfo | null>(null);
  const t = useI18n();
  const r = useReport();
  const { isTrafficLightVisible } = useTrafficLightStore(useSelector(['isTrafficLightVisible']));

  useEffect(() => {
    let unFn: UnlistenFn;
    async function handler() {
      const currentWindow = WebviewWindow.getCurrent();
      currentWindow.emitTo(currentWindow.label, 'loaded');
      unFn = await currentWindow.once('compare_file', (event: any) => {
        const file = event.payload.file as FileInfo;
        if (file) {
          setFile(file);
        }
      });
    }
    handler();
    return () => {
      unFn?.();
    };
  }, []);

  useEffect(() => {
    r('image_compare_imp');
  }, [file]);

  return (
    <div className='flex h-full w-full select-none flex-col px-2 pb-2'>
      <div
        className={cn('flex h-[48px] w-full items-center justify-between', {
          'pl-[63px]': isMac && isTrafficLightVisible,
        })}
        data-tauri-drag-region
      >
        {file ? (
          <div className='pointer-events-none flex w-full flex-1 select-none flex-nowrap items-center gap-2'>
            <span className='max-w-[40vw] truncate text-ellipsis text-sm font-bold text-neutral-900 dark:text-neutral-50'>
              {file?.name}
            </span>
            <Badge variant='mini'>-{file?.compressRate}</Badge>
          </div>
        ) : (
          <div></div>
        )}
        <WindowControl showControls={!isMac} showFullscreen={!isMac} />
      </div>
      <div className='flex w-full flex-1 items-center justify-center overflow-hidden rounded-lg bg-neutral-200 p-2 dark:bg-neutral-800'>
        {file ? (
          <div className='relative h-full w-full'>
            <ReactCompareSlider
              style={{
                width: '100%',
                height: '100%',
              }}
              itemOne={
                <ImageViewer
                  src={file?.originalTempPathConverted}
                  path={file?.originalTempPath}
                  ext={file?.ext}
                  size={file?.bytesSize}
                  className='h-full w-full'
                />
                // <ReactCompareSliderImage
                //   src={file?.originalTempPath}
                //   alt={file?.name}
                //   style={{
                //     width: '100%',
                //     height: '100%',
                //     objectFit: 'contain',
                //   }}
                // />
              }
              itemTwo={
                <ImageViewer
                  src={file?.assetPath}
                  path={file?.outputPath}
                  ext={file?.ext}
                  size={file?.compressedBytesSize}
                  className='h-full w-full'
                />
                // <ReactCompareSliderImage
                //   src={file?.assetPath}
                //   alt={file?.name}
                //   style={{
                //     width: '100%',
                //     height: '100%',
                //     objectFit: 'contain',
                //   }}
                // />
              }
            />
            <div className='absolute bottom-6 left-2 flex flex-col items-center justify-center overflow-hidden rounded-lg bg-neutral-800/80 p-2 dark:bg-neutral-50/80'>
              <div className='text-xs font-bold text-neutral-50 dark:text-neutral-900'>
                {t('beforeCompression')}
              </div>
              <div className='text-xs text-neutral-50 dark:text-neutral-900'>
                {file?.formattedBytesSize}{' '}
              </div>
            </div>
            <div className='absolute bottom-6 right-2 flex flex-col items-center justify-center overflow-hidden rounded-lg bg-neutral-800/80 p-2 dark:bg-neutral-50/80'>
              <div className='text-xs font-bold text-neutral-50 dark:text-neutral-900'>
                {t('afterCompression')}
              </div>
              <div className='text-xs text-neutral-50 dark:text-neutral-900'>
                {file?.formattedCompressedBytesSize}
              </div>
            </div>
          </div>
        ) : (
          <div className='text-sm text-neutral-500 dark:text-neutral-400'>
            {t('tips.load_image_failed')}
          </div>
        )}
      </div>
    </div>
  );
}
