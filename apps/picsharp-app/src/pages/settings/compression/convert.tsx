import { memo } from 'react';
import { useI18n } from '@/i18n';
import useSettingsStore from '@/store/settings';
import useSelector from '@/hooks/useSelector';
import { SettingsKey, ConvertFormat } from '@/constants';
import SettingItem from '../setting-item';
import { CheckboxGroup } from '@/components/checkbox-group';
import { Badge } from '@/components/ui/badge';
import { ColorPicker, ColorPickerProps } from 'antd';
import { Switch } from '@/components/ui/switch';

function Format() {
  const t = useI18n();
  const { compression_convert: convertTypes = [], set } = useSettingsStore(
    useSelector([SettingsKey.CompressionConvert, 'set']),
  );

  const options = [
    {
      value: ConvertFormat.Png,
      label: 'PNG',
    },
    {
      value: ConvertFormat.Jpg,
      label: 'JPG',
    },
    {
      value: ConvertFormat.Avif,
      label: 'AVIF',
    },
    {
      value: ConvertFormat.Webp,
      label: 'WebP',
    },
  ];

  const handleValueChange = (value: string[]) => {
    set(SettingsKey.CompressionConvert, value);
  };

  return (
    <SettingItem
      title={
        <>
          <span>{t('settings.compression.convert.format.title')}</span>
        </>
      }
      titleClassName='flex flex-row items-center gap-x-2'
      // description={t('settings.compression.convert.format.description')}
    >
      <CheckboxGroup options={options} value={convertTypes} onChange={handleValueChange} />
    </SettingItem>
  );
}

function ConvertAlpha() {
  const t = useI18n();
  const { compression_convert_alpha: color = '#FFFFFF', set } = useSettingsStore(
    useSelector([SettingsKey.CompressionConvertAlpha, 'set']),
  );

  const handleColorChange: ColorPickerProps['onChange'] = (color) => {
    set(SettingsKey.CompressionConvertAlpha, color.toHexString());
  };
  return (
    <SettingItem
      title={
        <>
          <span>{t('settings.compression.convert_alpha.title')}</span>
        </>
      }
      titleClassName='flex flex-row items-center gap-x-2'
      description={t('settings.compression.convert_alpha.description')}
    >
      <ColorPicker
        value={color}
        showText
        disabledAlpha
        arrow={false}
        onChange={handleColorChange}
        className='w-[max-content]'
      />
    </SettingItem>
  );
}

function Enabled() {
  const t = useI18n();

  const { compression_convert_enable: enable, set } = useSettingsStore(
    useSelector([SettingsKey.CompressionConvertEnable, 'set']),
  );

  const handleCheckedChange = (checked: boolean) => {
    set(SettingsKey.CompressionConvertEnable, checked);
  };

  return (
    <SettingItem
      title={
        <>
          <span>{t('settings.compression.convert.enable.title')}</span>
          <Badge variant='third'>{t(`settings.compression.mode.option.local`)}</Badge>
          <Badge variant='third'>TinyPNG</Badge>
        </>
      }
      titleClassName='flex flex-row items-center gap-x-2'
      description={t('settings.compression.convert.enable.description')}
    >
      <Switch checked={enable} onCheckedChange={handleCheckedChange} />
    </SettingItem>
  );
}

function SettingsCompressionConvert() {
  const { compression_convert_enable: enable } = useSettingsStore(
    useSelector([SettingsKey.CompressionConvertEnable]),
  );

  return (
    <>
      <Enabled />
      {enable && (
        <>
          <Format />
          <ConvertAlpha />
        </>
      )}
    </>
  );
}

export default memo(SettingsCompressionConvert);
