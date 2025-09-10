import { memo, useEffect, useState } from 'react';
import { useI18n } from '@/i18n';
import useSettingsStore from '@/store/settings';
import useSelector from '@/hooks/useSelector';
import { SettingsKey, WatermarkType, WatermarkPosition, VALID_IMAGE_EXTS } from '@/constants';
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
import { Button } from '@/components/ui/button';
import { open } from '@tauri-apps/plugin-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { exists } from '@tauri-apps/plugin-fs';
import { AlertCircle, Trash2 } from 'lucide-react';
import { openPath } from '@tauri-apps/plugin-opener';

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

function ImagePath() {
  const t = useI18n();
  const { compression_watermark_image_path: watermarkImagePath = '', set } = useSettingsStore(
    useSelector([SettingsKey.CompressionWatermarkImagePath, 'set']),
  );
  const [fileExists, setFileExists] = useState(false);

  useEffect(() => {
    if (watermarkImagePath) {
      exists(watermarkImagePath).then(setFileExists);
    } else {
      setFileExists(false);
    }
  }, [watermarkImagePath]);

  const handleSelectImage = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Image', extensions: VALID_IMAGE_EXTS }],
    });
    if (selected) {
      await set(SettingsKey.CompressionWatermarkImagePath, selected as string);
    }
  };

  const handleReset = async () => {
    await set(SettingsKey.CompressionWatermarkImagePath, '');
  };

  return (
    <SettingItem
      title={
        <>
          <span>{t('settings.compression.watermark.image.title')}</span>
        </>
      }
      titleClassName='flex flex-row items-center gap-x-2'
      description={t('settings.compression.watermark.image.description')}
    >
      <div className='flex flex-col items-end gap-y-2'>
        <div className='flex flex-row items-center gap-x-1'>
          <Button onClick={handleSelectImage} size='sm'>
            {t('settings.compression.watermark.image.select_image')}
          </Button>
          {watermarkImagePath && (
            <Button onClick={handleReset} size='icon' variant='ghost'>
              <Trash2 className='h-4 w-4' />
            </Button>
          )}
        </div>
        {watermarkImagePath ? (
          <Tooltip>
            <TooltipTrigger>
              <div className='flex items-center gap-x-1'>
                {!fileExists && <AlertCircle className='text-destructive h-4 w-4' />}
                <span
                  className='max-w-[250px] cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap text-sm underline'
                  onClick={() => {
                    if (fileExists) {
                      openPath(watermarkImagePath);
                    }
                  }}
                >
                  {watermarkImagePath}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {!fileExists
                ? t('settings.compression.watermark.image.file_not_exists')
                : watermarkImagePath}
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className='text-sm text-red-400 underline'>
            {t('settings.compression.watermark.image.not_set')}
          </span>
        )}
      </div>
    </SettingItem>
  );
}

function ImageOpacity() {
  const t = useI18n();
  const { compression_watermark_image_opacity: opacity = 1, set } = useSettingsStore(
    useSelector([SettingsKey.CompressionWatermarkImageOpacity, 'set']),
  );
  const [inputValue, setInputValue] = useState(String(opacity));

  useEffect(() => {
    setInputValue(String(opacity));
  }, [opacity]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleBlur = async () => {
    let value = parseFloat(inputValue);

    if (isNaN(value)) {
      value = 1;
    }

    if (value > 1) {
      value = 1;
    } else if (value < 0) {
      value = 0;
    }

    setInputValue(String(value));
    await set(SettingsKey.CompressionWatermarkImageOpacity, value);
  };

  return (
    <SettingItem
      title={
        <>
          <span>{t('settings.compression.watermark.image.opacity.title')}</span>
        </>
      }
      titleClassName='flex flex-row items-center gap-x-2'
      description={t('settings.compression.watermark.image.opacity.description')}
    >
      <div className='flex flex-row items-center gap-x-2'>
        <Input
          type='number'
          step={0.1}
          min={0}
          max={1}
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className='w-[160px] flex-shrink-0'
        />
      </div>
    </SettingItem>
  );
}

function ImageScale() {
  const t = useI18n();
  const { compression_watermark_image_scale: scale = 0.15, set } = useSettingsStore(
    useSelector([SettingsKey.CompressionWatermarkImageScale, 'set']),
  );
  const [inputValue, setInputValue] = useState(String(scale));

  useEffect(() => {
    setInputValue(String(scale));
  }, [scale]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleBlur = async () => {
    let value = parseFloat(inputValue);

    if (isNaN(value)) {
      value = 1;
    }

    if (value > 1) {
      value = 1;
    } else if (value < 0.05) {
      value = 0.05;
    }

    setInputValue(String(value));
    await set(SettingsKey.CompressionWatermarkImageScale, value);
  };

  return (
    <SettingItem
      title={
        <>
          <span>{t('settings.compression.watermark.image.scale.title')}</span>
        </>
      }
      titleClassName='flex flex-row items-center gap-x-2'
      description={t('settings.compression.watermark.image.scale.description')}
    >
      <div className='flex flex-row items-center gap-x-2'>
        <Input
          type='number'
          step={0.05}
          min={0.05}
          max={1}
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className='w-[160px] flex-shrink-0'
        />
      </div>
    </SettingItem>
  );
}

function Text() {
  const t = useI18n();
  const { compression_watermark_text: watermarkText = '', set } = useSettingsStore(
    useSelector([SettingsKey.CompressionWatermarkText, 'set']),
  );
  const [inputValue, setInputValue] = useState(watermarkText);

  useEffect(() => {
    setInputValue(watermarkText);
  }, [watermarkText]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleBlur = async () => {
    await set(SettingsKey.CompressionWatermarkText, inputValue);
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
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
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
  const [inputValue, setInputValue] = useState(String(fontSize));

  useEffect(() => {
    setInputValue(String(fontSize));
  }, [fontSize]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleBlur = async () => {
    let value = parseInt(inputValue, 10);
    if (isNaN(value) || value <= 0) {
      value = 16;
    }
    setInputValue(String(value));
    await set(SettingsKey.CompressionWatermarkFontSize, value);
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
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
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
      {watermarkType === WatermarkType.Image && (
        <>
          <ImagePath />
          <ImageOpacity />
          <ImageScale />
        </>
      )}
      {watermarkType !== WatermarkType.None && <Position />}
    </>
  );
}

export default memo(SettingsCompressionWatermark);
