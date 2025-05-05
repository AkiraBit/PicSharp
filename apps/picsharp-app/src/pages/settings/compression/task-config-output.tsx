import { memo, useState } from 'react';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useI18n } from '@/i18n';
import useSettingsStore from '@/store/settings';
import useSelector from '@/hooks/useSelector';
import { Input } from '@/components/ui/input';
import { SettingsKey, SettingsCompressionTaskConfigOutputMode } from '@/constants';
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

function SettingsCompressionTaskConfigOutput() {
  const t = useI18n();
  const {
    compression_tasks_output_mode: outputMode,
    compression_tasks_output_mode_save_as_file_suffix: saveAsFileSuffix,
    compression_tasks_output_mode_save_to_folder: saveToFolder,
    set,
  } = useSettingsStore(
    useSelector([
      SettingsKey.compression_tasks_output_mode,
      SettingsKey.compression_tasks_output_mode_save_as_file_suffix,
      SettingsKey.compression_tasks_output_mode_save_to_folder,
      'set',
    ]),
  );
  const [isSaveToFolderExists, setIsSaveToFolderExists] = useState(false);

  const outputModes = [
    {
      value: SettingsCompressionTaskConfigOutputMode.Overwrite,
      label: t('settings.compression.task_config.output.mode.overwrite'),
    },
    {
      value: SettingsCompressionTaskConfigOutputMode.SaveAsNewFile,
      label: t('settings.compression.task_config.output.mode.new_file'),
    },
    {
      value: SettingsCompressionTaskConfigOutputMode.SaveToNewFolder,
      label: t('settings.compression.task_config.output.mode.new_folder'),
    },
  ];

  const handleModeChange = (value: SettingsCompressionTaskConfigOutputMode) => {
    set(SettingsKey.compression_tasks_output_mode, value);
  };

  const handleSuffixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    set(SettingsKey.compression_tasks_output_mode_save_as_file_suffix, e.target.value);
  };

  const handleChooseFolder = async () => {
    const file = await open({
      multiple: false,
      directory: true,
    });
    if (file) {
      set(SettingsKey.compression_tasks_output_mode_save_to_folder, file);
    }
  };

  useAsyncEffect(async () => {
    const isExists = await exists(saveToFolder);
    setIsSaveToFolderExists(isExists);
  }, [saveToFolder]);

  return (
    <>
      <CardHeader className='flex flex-row justify-between gap-x-10'>
        <div>
          <CardTitle className='text-lg'>
            {t('settings.compression.task_config.output.title')}
          </CardTitle>
          <CardDescription>
            {t('settings.compression.task_config.output.description')}
          </CardDescription>
        </div>
        <Select value={outputMode} onValueChange={handleModeChange}>
          <SelectTrigger className='w-[180px]'>
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
      </CardHeader>
      {outputMode === SettingsCompressionTaskConfigOutputMode.SaveAsNewFile && (
        <CardHeader>
          <div className='flex items-center justify-between gap-x-10'>
            <div>
              <CardTitle className='text-lg'>
                {t('settings.compression.task_config.output.mode.new_file.title')}
              </CardTitle>
              <CardDescription>
                {t('settings.compression.task_config.output.mode.new_file.description')}
              </CardDescription>
            </div>
            <Input
              type='text'
              placeholder={t('settings.compression.task_config.output.mode.new_file.title')}
              className='w-[180px]'
              value={saveAsFileSuffix || ''}
              onChange={handleSuffixChange}
            />
          </div>
        </CardHeader>
      )}
      {outputMode === SettingsCompressionTaskConfigOutputMode.SaveToNewFolder && (
        <CardHeader>
          <div className='flex items-center justify-between gap-x-10'>
            <div>
              <CardTitle className='text-lg'>
                {t('settings.compression.task_config.output.mode.new_folder.title')}
              </CardTitle>
              <CardDescription>
                {t('settings.compression.task_config.output.mode.new_folder.description')}
              </CardDescription>
            </div>
            <div className='flex flex-col items-end gap-y-2'>
              <Button className='w-[auto]' size={'sm'} onClick={handleChooseFolder}>
                {t('settings.compression.task_config.output.mode.new_folder.choose')}
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
                      className='max-w-[300px] cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap text-sm text-foreground underline'
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
          </div>
        </CardHeader>
      )}
    </>
  );
}

export default memo(SettingsCompressionTaskConfigOutput);
