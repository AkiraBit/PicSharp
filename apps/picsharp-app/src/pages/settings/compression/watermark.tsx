import { memo, useEffect, useState } from 'react';
import { useI18n } from '@/i18n';
import useSettingsStore from '@/store/settings';
import useSelector from '@/hooks/useSelector';
import { SettingsKey, WatermarkType, WatermarkPosition } from '@/constants';
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
import { ColorPicker, ColorPickerProps } from 'antd';

function Type() {
  const t = useI18n();
  const { compression_watermark_type: watermarkType = WatermarkType.None, set } = useSettingsStore(
    useSelector([SettingsKey.CompressionWatermarkType, 'set']),
  );

  const options = [
    { value: WatermarkType.None, label: t('settings.compression.watermark.option.type.none') },
    { value: WatermarkType.Text, label: t('settings.compression.watermark.option.type.text') },
    { value: WatermarkType.Image, label: t('settings.compression.watermark.option.type.image') },
  ];

  const handleChange = async (value: string) => {
    await set(SettingsKey.CompressionWatermarkType, value);
  };

  return (
    <SettingItem
      title={
        <>
          <span>{t('settings.compression.watermark.title')}</span>
          <Badge variant='third'>{t(`settings.compression.mode.option.local`)}</Badge>
          <Badge variant='third'>TinyPNG</Badge>
        </>
      }
      titleClassName='flex flex-row items-center gap-x-2'
      description={t('settings.compression.watermark.description')}
    >
      <div className='flex flex-row items-center gap-x-2'>
        <Select value={watermarkType} onValueChange={handleChange}>
          <SelectTrigger className='w-[160px]'>
            <SelectValue placeholder={t('settings.compression.watermark.title')} />
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

function Text() {
  const t = useI18n();
  const { compression_watermark_text: watermarkText = '', set } = useSettingsStore(
    useSelector([SettingsKey.CompressionWatermarkText, 'set']),
  );

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await set(SettingsKey.CompressionWatermarkText, event.target.value);
  };

  return (
    <SettingItem
      title={
        <>
          <span>{t('settings.compression.watermark.text.title')}</span>
        </>
      }
      titleClassName='flex flex-row items-center gap-x-2'
      description={t('settings.compression.watermark.text.description')}
    >
      <div className='flex flex-row items-center gap-x-2'>
        <Input
          defaultValue={watermarkText}
          onChange={handleChange}
          className='w-[160px] flex-shrink-0'
        />
      </div>
    </SettingItem>
  );
}

function TextColor() {
  const t = useI18n();
  const { compression_watermark_text_color: watermarkTextColor = '#FFFFFF', set } =
    useSettingsStore(useSelector([SettingsKey.CompressionWatermarkTextColor, 'set']));

  const handleColorChange: ColorPickerProps['onChange'] = (color) => {
    console.log(color);
    set(SettingsKey.CompressionWatermarkTextColor, color.toHexString());
  };

  return (
    <SettingItem
      title={
        <>
          <span>{t('settings.compression.watermark.text.color.title')}</span>
        </>
      }
      titleClassName='flex flex-row items-center gap-x-2'
      description={t('settings.compression.watermark.text.color.description')}
    >
      <div className='flex flex-row items-center gap-x-2'>
        <ColorPicker
          value={watermarkTextColor}
          showText
          disabledAlpha
          arrow={false}
          onChange={handleColorChange}
          className='w-[max-content]'
        />
      </div>
    </SettingItem>
  );
}

function TextFontSize() {
  const t = useI18n();
  const { compression_watermark_text_font_size: fontSize = 16, set } = useSettingsStore(
    useSelector([SettingsKey.CompressionWatermarkFontSize, 'set']),
  );

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await set(SettingsKey.CompressionWatermarkFontSize, event.target.value);
  };

  return (
    <SettingItem
      title={
        <>
          <span>{t('settings.compression.watermark.text.font_size.title')}</span>
        </>
      }
      titleClassName='flex flex-row items-center gap-x-2'
      description={t('settings.compression.watermark.text.font_size.description')}
    >
      <div className='flex flex-row items-center gap-x-2'>
        <Input
          type='number'
          defaultValue={fontSize}
          onChange={handleChange}
          className='w-[160px] flex-shrink-0'
        />
      </div>
    </SettingItem>
  );
}

function Position() {
  const t = useI18n();
  const { compression_watermark_position: watermarkPosition = WatermarkPosition.BottomRight, set } =
    useSettingsStore(useSelector([SettingsKey.CompressionWatermarkPosition, 'set']));

  const options = [
    {
      value: WatermarkPosition.Top,
      label: t('settings.compression.watermark.option.position.top'),
    },
    {
      value: WatermarkPosition.TopLeft,
      label: t('settings.compression.watermark.option.position.top_left'),
    },
    {
      value: WatermarkPosition.TopRight,
      label: t('settings.compression.watermark.option.position.top_right'),
    },
    {
      value: WatermarkPosition.Center,
      label: t('settings.compression.watermark.option.position.center'),
    },
    {
      value: WatermarkPosition.Bottom,
      label: t('settings.compression.watermark.option.position.bottom'),
    },
    {
      value: WatermarkPosition.BottomLeft,
      label: t('settings.compression.watermark.option.position.bottom_left'),
    },
    {
      value: WatermarkPosition.BottomRight,
      label: t('settings.compression.watermark.option.position.bottom_right'),
    },
    {
      value: WatermarkPosition.Left,
      label: t('settings.compression.watermark.option.position.left'),
    },
    {
      value: WatermarkPosition.Right,
      label: t('settings.compression.watermark.option.position.right'),
    },
  ];

  const handleChange = async (value: string) => {
    await set(SettingsKey.CompressionWatermarkPosition, value);
  };

  return (
    <SettingItem
      title={
        <>
          <span>{t('settings.compression.watermark.position.title')}</span>
        </>
      }
      titleClassName='flex flex-row items-center gap-x-2'
      description={t('settings.compression.watermark.position.description')}
    >
      <div className='flex flex-row items-center gap-x-2'>
        <Select value={watermarkPosition} onValueChange={handleChange}>
          <SelectTrigger className='w-[160px]'>
            <SelectValue placeholder={t('settings.compression.watermark.position.title')} />
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

function SettingsCompressionWatermark() {
  const { compression_watermark_type: watermarkType = WatermarkType.None } = useSettingsStore(
    useSelector([SettingsKey.CompressionWatermarkType]),
  );
  return (
    <>
      <Type />
      {watermarkType === WatermarkType.Text && (
        <>
          <Text />
          <TextFontSize />
          <TextColor />
        </>
      )}
      <Position />
    </>
  );
}

export default memo(SettingsCompressionWatermark);
