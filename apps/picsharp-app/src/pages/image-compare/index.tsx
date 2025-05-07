import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { parseOpenWithFiles } from '@/utils/launch';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n';

const launchPayload = parseOpenWithFiles();
export default function ImageCompare() {
  const file = launchPayload?.mode === 'compress:compare' ? launchPayload?.file : null;
  const t = useI18n();

  if (!file) return null;

  return (
    <div className='flex h-full select-none flex-col px-2 pb-2'>
      <div className='flex h-7 items-center justify-between pl-[63px]'>
        <div className='flex flex-1 flex-nowrap items-center gap-2'>
          <div className='max-w-[50%] truncate text-ellipsis text-sm font-bold text-neutral-900 dark:text-neutral-50'>
            {file?.name}
          </div>
          <Badge variant='mini'>-{file?.compressRate}</Badge>
        </div>
        <div></div>
      </div>
      <div className='flex w-full flex-1 items-center justify-center overflow-hidden rounded-lg bg-neutral-200 p-2 dark:bg-neutral-800'>
        <div className='relative h-[max-content] w-full'>
          {file && (
            <ReactCompareSlider
              itemOne={<ReactCompareSliderImage src={file?.originalTempPath} alt={file?.name} />}
              itemTwo={<ReactCompareSliderImage src={file?.assetPath} alt={file?.name} />}
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
