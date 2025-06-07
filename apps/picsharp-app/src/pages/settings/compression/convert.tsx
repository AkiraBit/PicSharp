import { memo } from 'react';
import { useI18n } from '@/i18n';
import useSettingsStore from '@/store/settings';
import useSelector from '@/hooks/useSelector';
import { SettingsKey, ConvertFormat } from '@/constants';
import SettingItem from '../setting-item';
import { CheckboxGroup } from '@/components/checkbox-group';
import { Badge } from '@/components/ui/badge';
import { ColorPicker, ColorPickerProps } from 'antd';

function SettingsCompressionConvert() {
  const t = useI18n();
  const {
    compression_convert: convertTypes = [],
    compression_convert_alpha: color = '#FFFFFF',
    set,
  } = useSettingsStore(
    useSelector([SettingsKey.CompressionConvert, SettingsKey.CompressionConvertAlpha, 'set']),
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

  const handleColorChange: ColorPickerProps['onChange'] = (color) => {
    set(SettingsKey.CompressionConvertAlpha, color.toHexString());
  };

  return (
    <>
      <SettingItem
        title={
          <>
            <span>{t('settings.compression.convert.title')}</span>
            <Badge variant='third'>{t(`settings.compression.mode.option.local`)}</Badge>
            <Badge variant='third'>TinyPNG</Badge>
          </>
        }
        titleClassName='flex flex-row items-center gap-x-2'
        description={t('settings.compression.convert.description')}
      >
        <CheckboxGroup options={options} value={convertTypes} onChange={handleValueChange} />
      </SettingItem>
      <SettingItem
        title={
          <>
            <span>{t('settings.compression.convert_alpha.title')}</span>
            <Badge variant='third'>{t(`settings.compression.mode.option.local`)}</Badge>
            <Badge variant='third'>TinyPNG</Badge>
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
        />
      </SettingItem>
    </>
  );
}

export default memo(SettingsCompressionConvert);
