import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CircleHelpIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n';

export default function FormatsTips() {
  const t = useI18n();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='ghost' size='icon' className='cursor-pointer text-neutral-400'>
          <CircleHelpIcon size={32} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='w-80 backdrop-blur-sm backdrop-saturate-150 dark:bg-neutral-900/80'
        sideOffset={10}
        align='end'
        alignOffset={0}
      >
        <div className='text-center'>
          <p className='dark:text-foreground mb-2 text-sm text-slate-500'>
            {t('page.compression.classic.tinypng_supported_formats')}
          </p>
          <div className='flex flex-wrap justify-center gap-2'>
            {['PNG/Animated PNG', 'JPEG', 'WebP', 'AVIF'].map((format) => (
              <Badge key={format} variant='midnight' className='font-normal'>
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
            {['PNG', 'JPEG', 'WebP/Animated WebP', 'AVIF', 'TIFF', 'GIF', 'SVG'].map((format) => (
              <Badge key={format} variant='midnight' className='font-normal'>
                {format}
              </Badge>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
