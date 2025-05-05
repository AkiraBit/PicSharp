import { memo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useI18n } from '@/i18n';
import useSettingsStore from '@/store/settings';
import useSelector from '@/hooks/useSelector';
import { SettingsKey, SettingsCompressionQualityMode } from '@/constants';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

function SettingsCompressionLocalConfig() {
  const t = useI18n();
  const {
    compression_local_quality_level: qualityLevel,
    compression_local_quality_mode: qualityMode,
    set,
  } = useSettingsStore(
    useSelector([
      SettingsKey.compression_local_quality_level,
      SettingsKey.compression_local_quality_mode,
      'set',
    ]),
  );
  const compressionLevels = [
    {
      value: '1',
      label: t('settings.compression.local_config.quality_level.1'),
    },
    {
      value: '2',
      label: t('settings.compression.local_config.quality_level.2'),
    },
    {
      value: '3',
      label: t('settings.compression.local_config.quality_level.3'),
    },
    {
      value: '4',
      label: t('settings.compression.local_config.quality_level.4'),
    },
    {
      value: '5',
      label: t('settings.compression.local_config.quality_level.5'),
    },
  ];

  const pngModes = [
    {
      value: SettingsCompressionQualityMode.Lossless,
      label: t('lossless_compression'),
    },
    {
      value: SettingsCompressionQualityMode.Lossy,
      label: t('lossy_compression'),
    },
  ];

  const handleQualityModeChange = (value: SettingsCompressionQualityMode) => {
    set(SettingsKey.compression_local_quality_mode, value);
  };

  const handleQualityLevelChange = (value: string) => {
    set(SettingsKey.compression_local_quality_level, parseInt(value));
  };

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between gap-x-10'>
        <div>
          <CardTitle className='flex flex-row items-center gap-x-2 text-lg'>
            <span>{t('settings.compression.local_config.quality_mode.title')}</span>
            <Badge variant='third'>{t('local_compression')}</Badge>
          </CardTitle>
          <CardDescription>
            {t('settings.compression.local_config.quality_mode.description')}
          </CardDescription>
        </div>
        <Select value={qualityMode} onValueChange={handleQualityModeChange}>
          <SelectTrigger className='w-[180px] flex-shrink-0'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {pngModes.map((mode) => (
                <SelectItem key={mode.value} value={mode.value}>
                  {mode.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardHeader className='flex flex-row items-center justify-between gap-x-10'>
        <div>
          <CardTitle className='flex flex-row items-center gap-x-2 text-lg'>
            <span>{t('settings.compression.local_config.quality_level.title')}</span>
            <Badge variant='third'>{t('local_compression')}</Badge>
          </CardTitle>
          <CardDescription>
            {t('settings.compression.local_config.quality_level.description')}
          </CardDescription>
        </div>
        <div className='flex flex-row items-center gap-x-2'>
          <Select value={qualityLevel.toString()} onValueChange={handleQualityLevelChange}>
            <SelectTrigger className='w-[180px]'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {compressionLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
    </Card>
  );
}

export default memo(SettingsCompressionLocalConfig);
