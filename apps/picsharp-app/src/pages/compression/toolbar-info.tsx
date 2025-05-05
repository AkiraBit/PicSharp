import { memo } from 'react';
import useCompressionStore from '@/store/compression';
import useSelector from '@/hooks/useSelector';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Info } from 'lucide-react';
import { useI18n } from '@/i18n';
import { humanSize } from '@/utils/fs';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

const PopoverContent = () => {
  const { files } = useCompressionStore(useSelector(['files']));
  const t = useI18n();

  // 压缩前文件总大小
  const totalOriginalSize = files.reduce((acc, file) => {
    return acc + file.bytesSize;
  }, 0);

  // 压缩后节省
  const totalSavedVolume = files.reduce((acc, file) => {
    if (file.compressedBytesSize) {
      return acc + (file.bytesSize - file.compressedBytesSize);
    }
    return acc;
  }, 0);

  // 压缩率
  const compressRate =
    totalSavedVolume > 0 ? ((totalSavedVolume / totalOriginalSize) * 100).toFixed(2) : '0';

  return (
    <div className='flex items-center'>
      <div className='flex flex-col items-center'>
        <div className='text-sm'>{t('compression.toolbar.info.total_files')}</div>
        <div className='text-lg font-bold'>{files.length}</div>
      </div>
      <Separator orientation='vertical' className='mx-6 h-[40px]' />
      <div className='flex flex-col items-center'>
        <div className='text-sm'>{t('compression.toolbar.info.total_original_size')}</div>
        <div className='text-lg font-bold'>{humanSize(totalOriginalSize)}</div>
      </div>
      <Separator orientation='vertical' className='mx-6 h-[40px]' />
      <div className='flex flex-col items-center'>
        <div className='text-sm'>{t('compression.toolbar.info.total_saved_volume')}</div>
        <div className='text-lg font-bold'>{humanSize(totalSavedVolume)}</div>
      </div>
      <Separator orientation='vertical' className='mx-6 h-[40px]' />
      <div className='flex flex-col items-center'>
        <div className='text-sm'>{t('compression.toolbar.info.saved_volume_rate')}</div>
        <div className='text-lg font-bold'>{compressRate}%</div>
      </div>
    </div>
  );
};

export default memo(function ToolbarInfo() {
  return (
    <HoverCard openDelay={300}>
      <HoverCardTrigger asChild>
        <Button variant='ghost' size='icon' className='dark:hover:bg-neutral-700/50'>
          <Info className='h-4 w-4' />
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className='w-[max-content] dark:bg-neutral-900'>
        <PopoverContent />
      </HoverCardContent>
    </HoverCard>
  );
});
