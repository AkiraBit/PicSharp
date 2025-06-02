import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { parseOpenWithFiles } from '@/utils/launch';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n';
import { isMac } from '@/utils';
import { cn } from '@/lib/utils';

const launchPayload = parseOpenWithFiles();
export default function ImageCompare() {
  const file = launchPayload?.mode === 'compress:compare' ? launchPayload?.file : null;
  const t = useI18n();

  if (!file) return null;

  return (
    <div className='flex h-full w-full select-none flex-col px-2 pb-2'>
      <div
        className={cn('flex h-7 w-full items-center justify-between', {
          'pl-[63px]': isMac,
        })}
      >
        <div className='flex w-full flex-1 flex-nowrap items-center gap-2'>
          <span className='max-w-[40vw] truncate text-ellipsis text-sm font-bold text-neutral-900 dark:text-neutral-50'>
            {file?.name}
          </span>
          <Badge variant='mini'>-{file?.compressRate}</Badge>
        </div>
        <div></div>
      </div>
      <div className='flex w-full flex-1 items-center justify-center overflow-hidden rounded-lg bg-neutral-200 p-2 dark:bg-neutral-800'>
        <div className='relative h-full w-full'>
          {file && (
            <ReactCompareSlider
              style={{
                width: '100%',
                height: '100%',
              }}
              itemOne={
                <ReactCompareSliderImage
                  src={file?.originalTempPath}
                  alt={file?.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              }
              itemTwo={
                <ReactCompareSliderImage
                  src={file?.assetPath}
                  alt={file?.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              }
            />
          )}
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
      </div>
    </div>
  );
}
