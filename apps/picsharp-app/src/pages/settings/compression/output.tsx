import { memo, useState } from 'react';
import { useI18n } from '@/i18n';
import useSettingsStore from '@/store/settings';
import useSelector from '@/hooks/useSelector';
import { Input } from '@/components/ui/input';
import { SettingsKey, CompressionOutputMode } from '@/constants';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { open } from '@tauri-apps/plugin-dialog';
import { Badge } from '@/components/ui/badge';
import { openPath } from '@tauri-apps/plugin-opener';
import { useAsyncEffect } from 'ahooks';
import { exists } from '@tauri-apps/plugin-fs';
import { message } from '@tauri-apps/plugin-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import SettingItem from '../setting-item';

function SettingsCompressionOutput() {
  const t = useI18n();
  const {
    compression_output: outputMode,
    compression_output_save_as_file_suffix: saveAsFileSuffix,
    compression_output_save_to_folder: saveToFolder,
    set,
  } = useSettingsStore(
    useSelector([
      SettingsKey.CompressionOutput,
      SettingsKey.CompressionOutputSaveAsFileSuffix,
      SettingsKey.CompressionOutputSaveToFolder,
      'set',
    ]),
  );
  const [isSaveToFolderExists, setIsSaveToFolderExists] = useState(false);

  const outputModes = [
    {
      value: CompressionOutputMode.Overwrite,
      label: t('settings.compression.output.option.overwrite'),
    },
    {
      value: CompressionOutputMode.SaveAsNewFile,
      label: t('settings.compression.output.option.save_as_new_file'),
    },
    {
      value: CompressionOutputMode.SaveToNewFolder,
      label: t('settings.compression.output.option.save_to_new_folder'),
    },
  ];

  const handleModeChange = (value: CompressionOutputMode) => {
    set(SettingsKey.CompressionOutput, value);
  };

  const handleSuffixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    set(SettingsKey.CompressionOutputSaveAsFileSuffix, e.target.value);
  };

  const handleChooseFolder = async () => {
    const file = await open({
      multiple: false,
      directory: true,
    });
    if (file) {
      set(SettingsKey.CompressionOutputSaveToFolder, file);
    }
  };

  useAsyncEffect(async () => {
    const isExists = await exists(saveToFolder);
    setIsSaveToFolderExists(isExists);
  }, [saveToFolder]);

  return (
    <>
      <SettingItem
        title={t('settings.compression.output.title')}
        description={t('settings.compression.output.description')}
      >
        <Select value={outputMode} onValueChange={handleModeChange}>
          <SelectTrigger className='flex-shrink-0'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {outputModes.map((mode) => (
                <SelectItem key={mode.value} value={mode.value}>
                  {mode.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </SettingItem>
      {outputMode === CompressionOutputMode.SaveAsNewFile && (
        <SettingItem
          title={t('settings.compression.output.option.save_as_new_file.title')}
          description={t('settings.compression.output.option.save_as_new_file.description')}
        >
          <Input
            type='text'
            placeholder={t('settings.compression.output.option.save_as_new_file.title')}
            className='flex-shrink-0'
            value={saveAsFileSuffix || ''}
            onChange={handleSuffixChange}
          />
        </SettingItem>
      )}
      {outputMode === CompressionOutputMode.SaveToNewFolder && (
        <SettingItem
          title={t('settings.compression.output.option.save_to_new_folder.title')}
          description={t('settings.compression.output.option.save_to_new_folder.description')}
        >
          <div className='flex flex-col items-end gap-y-2'>
            <Button className='w-[auto]' size={'sm'} onClick={handleChooseFolder}>
              {t('settings.compression.output.option.save_to_new_folder.choose')}
            </Button>
            <div className='flex items-center gap-x-2'>
              <Tooltip>
                <TooltipTrigger>
                  <p
                    onClick={() => {
                      if (!isSaveToFolderExists) {
                        message(t('tips.path_not_exists'), {
                          title: t('tips.error'),
                          kind: 'error',
                        });
                        return;
                      }
                      openPath(saveToFolder);
                    }}
                    className='text-foreground max-w-[300px] cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap text-sm underline'
                  >
                    {saveToFolder}
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{saveToFolder}</p>
                </TooltipContent>
              </Tooltip>
              {saveToFolder ? (
                !isSaveToFolderExists ? (
                  <Badge variant='destructive'>{t('tips.path_not_exists')}</Badge>
                ) : (
                  <></>
                )
              ) : (
                <Badge variant='destructive'>{t('no_config')}</Badge>
              )}
            </div>
          </div>
        </SettingItem>
      )}
    </>
  );
}

export default memo(SettingsCompressionOutput);
