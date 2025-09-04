import { memo, useEffect, useState } from 'react';
import { useI18n } from '@/i18n';
import useSettingsStore from '@/store/settings';
import useSelector from '@/hooks/useSelector';
import { SettingsKey, ResizeFit } from '@/constants';
import SettingItem from '../setting-item';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function Diamensions() {
  const t = useI18n();
  const { compression_resize_dimensions: resizeDimensions = [0, 0], set } = useSettingsStore(
    useSelector([SettingsKey.CompressionResizeDimensions, 'set']),
  );

  const [width, setWidth] = useState(resizeDimensions[0]);
  const [height, setHeight] = useState(resizeDimensions[1]);

  useEffect(() => {
    setWidth(resizeDimensions[0]);
    setHeight(resizeDimensions[1]);
  }, [resizeDimensions]);

  const autoText = t('settings.compression.resize.dimensions.auto');

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replaceAll(autoText, '');
    if (/^\d*$/.test(value)) {
      setWidth(value === '' ? 0 : parseInt(value, 10));
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replaceAll(autoText, '');
    if (/^\d*$/.test(value)) {
      setHeight(value === '' ? 0 : parseInt(value, 10));
    }
  };

  const handleBlur = () => {
    if (width !== resizeDimensions[0] || height !== resizeDimensions[1]) {
      set(SettingsKey.CompressionResizeDimensions, [width, height]);
    }
  };

  return (
    <SettingItem
      title={
        <>
          <span>{t('settings.compression.resize.dimensions.title')}</span>
          <Badge variant='third'>{t(`settings.compression.mode.option.local`)}</Badge>
          <Badge variant='third'>TinyPNG</Badge>
        </>
      }
      titleClassName='flex flex-row items-center gap-x-2'
      description={t('settings.compression.resize.dimensions.description')}
    >
      <div className='flex flex-row items-center gap-x-2'>
        <div>
          <Label className='text-[12px] text-neutral-500'>
            {t('settings.compression.resize.dimensions.width')}
          </Label>
          <Input
            value={width === 0 ? autoText : width}
            onChange={handleWidthChange}
            onBlur={handleBlur}
          />
        </div>
        <X className='mt-5 h-6 w-7' />
        <div>
          <Label className='text-[12px] text-neutral-500'>
            {t('settings.compression.resize.dimensions.height')}
          </Label>
          <Input
            value={height === 0 ? autoText : height}
            onChange={handleHeightChange}
            onBlur={handleBlur}
          />
        </div>
      </div>
    </SettingItem>
  );
}

function Fit() {
  const t = useI18n();
  const { compression_resize_fit: resizeFit = ResizeFit.Cover, set } = useSettingsStore(
    useSelector([SettingsKey.CompressionResizeFit, 'set']),
  );

  const options = [
    { value: ResizeFit.Contain, label: t('settings.compression.resize.fit.option.contain') },
    { value: ResizeFit.Cover, label: t('settings.compression.resize.fit.option.cover') },
    { value: ResizeFit.Fill, label: t('settings.compression.resize.fit.option.fill') },
    { value: ResizeFit.Inside, label: t('settings.compression.resize.fit.option.inside') },
    { value: ResizeFit.Outside, label: t('settings.compression.resize.fit.option.outside') },
  ];

  const handleChange = async (value: string) => {
    await set(SettingsKey.CompressionResizeFit, value);
  };

  return (
    <SettingItem
      title={
        <div className='flex flex-row items-center gap-x-2'>
          <span>{t('settings.compression.resize.fit.title')}</span>
        </div>
      }
      description={t('settings.compression.resize.fit.description')}
    >
      <div className='flex flex-row items-center gap-x-2'>
        <Tooltip>
          <TooltipTrigger>
            <Info className='h-4 w-4' />
          </TooltipTrigger>
          <TooltipContent>
            <div className='max-w-xs p-2 text-left'>
              <ul className='space-y-2'>
                <li>{t('settings.compression.resize.fit.tooltip.contain')}</li>
                <li>{t('settings.compression.resize.fit.tooltip.cover')}</li>
                <li>{t('settings.compression.resize.fit.tooltip.fill')}</li>
                <li>{t('settings.compression.resize.fit.tooltip.inside')}</li>
                <li>{t('settings.compression.resize.fit.tooltip.outside')}</li>
              </ul>
            </div>
          </TooltipContent>
        </Tooltip>
        <Select value={resizeFit} onValueChange={handleChange}>
          <SelectTrigger className='w-[128px]'>
            <SelectValue placeholder={t('settings.compression.resize.fit.title')} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {options.map((action) => (
                <SelectItem key={action.value} value={action.value}>
                  {action.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </SettingItem>
  );
}

function SettingsCompressionResize() {
  return (
    <>
      <Diamensions />
      <Fit />
    </>
  );
}

export default memo(SettingsCompressionResize);
