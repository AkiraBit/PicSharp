import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import useAppStore from '@/store/app';
import useCompressionStore from '@/store/compression';
import useSelector from '@/hooks/useSelector';
import { SettingsKey, CompressionMode, CompressionOutputMode } from '@/constants';
import { isValidArray, correctFloat } from '@/utils';
import Compressor from '@/utils/compressor';
import { toast } from 'sonner';
import { humanSize } from '@/utils/fs';
import { isString } from 'radash';
import { useI18n } from '@/i18n';
import useSettingsStore from '@/store/settings';
import { sendTextNotification } from '@/utils/notification';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ask } from '@tauri-apps/plugin-dialog';
import { useNavigate } from '@/hooks/useNavigate';
import { ICompressor } from '@/utils/compressor';
import { appCacheDir, join } from '@tauri-apps/api/path';

function ToolbarCompress() {
  const { sidecar } = useAppStore();
  const { selectedFiles, fileMap, files, setInCompressing, inCompressing, eventEmitter } =
    useCompressionStore(
      useSelector([
        'selectedFiles',
        'fileMap',
        'files',
        'setInCompressing',
        'inCompressing',
        'eventEmitter',
      ]),
    );
  const {
    [SettingsKey.TinypngApiKeys]: tinypngApiKeys,
    [SettingsKey.CompressionMode]: compressionMode,
    [SettingsKey.CompressionOutput]: outputMode,
    [SettingsKey.CompressionOutputSaveToFolder]: saveToFolder,
    [SettingsKey.CompressionOutputSaveAsFileSuffix]: saveAsFileSuffix,
    [SettingsKey.CompressionThresholdEnable]: thresholdEnable,
    [SettingsKey.CompressionThresholdValue]: thresholdValue,
    [SettingsKey.CompressionType]: compressionType,
    [SettingsKey.CompressionLevel]: compressionLevel,
  } = useSettingsStore(
    useSelector([
      SettingsKey.TinypngApiKeys,
      SettingsKey.CompressionMode,
      SettingsKey.CompressionOutput,
      SettingsKey.CompressionOutputSaveToFolder,
      SettingsKey.CompressionOutputSaveAsFileSuffix,
      SettingsKey.CompressionThresholdEnable,
      SettingsKey.CompressionThresholdValue,
      SettingsKey.CompressionType,
      SettingsKey.CompressionLevel,
    ]),
  );
  const navigate = useNavigate();
  const t = useI18n();

  const disabledCompress =
    !files.length ||
    inCompressing ||
    !selectedFiles.some(
      (file) =>
        fileMap.get(file)?.status === ICompressor.Status.Pending ||
        fileMap.get(file)?.status === ICompressor.Status.Failed,
    );

  const handleCompress = async () => {
    if (compressionMode !== CompressionMode.Local && !isValidArray(tinypngApiKeys)) {
      const result = await ask('', {
        title: t('tips.tinypng_api_keys_not_configured'),
        okLabel: t('goToSettings'),
        cancelLabel: t('cancel'),
      });
      if (result) {
        navigate('/settings/tinypng', {
          confirm: false,
        });
      }
      return;
    }

    if (outputMode === CompressionOutputMode.SaveToNewFolder && !saveToFolder) {
      const result = await ask('', {
        title: t('tips.save_to_folder_not_configured'),
        okLabel: t('goToSettings'),
        cancelLabel: t('cancel'),
      });
      if (result) {
        navigate('/settings/compression', {
          confirm: false,
        });
      }
      return;
    }

    setInCompressing(true);
    const files = selectedFiles
      .map<FileInfo>((id) => {
        const file = fileMap.get(id);
        if (
          file &&
          (file.status === ICompressor.Status.Pending || file.status === ICompressor.Status.Failed)
        ) {
          file.status = ICompressor.Status.Processing;
          return file;
        }
      })
      .filter(Boolean);

    eventEmitter.emit('update_file_item', 'all');

    const toastId = toast('Compress');
    let fulfilled = 0;
    let rejected = 0;
    const appCacheDirPath = await appCacheDir();
    const tempDir = await join(appCacheDirPath, 'picsharp_temp');
    const compressor = new Compressor({
      compressionMode,
      compressionLevel,
      compressionType,
      limitCompressRate: thresholdEnable ? thresholdValue : undefined,
      tinifyApiKeys: tinypngApiKeys.map((key) => key.api_key),
      save: {
        mode: outputMode,
        newFileSuffix: saveAsFileSuffix,
        newFolderPath: saveToFolder,
      },
      tempDir,
      sidecarDomain: sidecar?.origin,
    }).compress(
      files,
      (res) => {
        console.log('res', res);
        const targetFile = fileMap.get(res.input_path);
        if (targetFile) {
          fulfilled++;
          toast(
            t('tips.compressing', {
              fulfilled,
              rejected,
              total: files.length,
            }),
            {
              id: toastId,
            },
          );
          targetFile.status = ICompressor.Status.Completed;
          if (res.compression_rate > 0) {
            targetFile.compressedBytesSize = res.output_size;
            targetFile.compressedDiskSize = res.output_size;
            targetFile.formattedCompressedBytesSize = humanSize(res.output_size);
            targetFile.compressRate = `${correctFloat(res.compression_rate * 100)}%`;
          } else {
            targetFile.compressedBytesSize = targetFile.bytesSize;
            targetFile.compressedDiskSize = targetFile.diskSize;
            targetFile.formattedCompressedBytesSize = humanSize(targetFile.bytesSize);
            targetFile.compressRate = '0%';
          }
          targetFile.assetPath = res.output_converted_path;
          targetFile.outputPath = res.output_path;
          targetFile.originalTempPath = res.original_temp_converted_path;
        } else {
          targetFile.status = ICompressor.Status.Failed;
          targetFile.errorMessage = 'Process failed,Please try again';
        }
        eventEmitter.emit('update_file_item', targetFile.path);
      },
      (res) => {
        const targetFile = fileMap.get(res.input_path);
        if (targetFile) {
          rejected++;
          toast(
            t('tips.compressing', {
              fulfilled,
              rejected,
              total: files.length,
            }),
            {
              id: toastId,
            },
          );
          targetFile.status = ICompressor.Status.Failed;
          if (isString(res.error)) {
            targetFile.errorMessage = res.error;
          } else {
            targetFile.errorMessage = res.error.toString();
          }
          eventEmitter.emit('update_file_item', targetFile.path);
        }
      },
    );
    toast.promise(compressor, {
      loading: t('tips.compressing', {
        fulfilled,
        rejected,
        total: files.length,
      }),
      id: toastId,
      success: () => {
        setInCompressing(false);
        sendTextNotification(
          'PicSharp',
          t('tips.compress_completed', {
            fulfilled,
            rejected,
            total: files.length,
          }),
        );
        return t('tips.compress_completed', {
          fulfilled,
          rejected,
          total: files.length,
        });
      },
      error: () => {
        setInCompressing(false);
        sendTextNotification(
          'PicSharp',
          t('tips.compress_completed', {
            fulfilled,
            rejected,
            total: files.length,
          }),
        );
        return t('tips.compress_completed', {
          fulfilled,
          rejected,
          total: files.length,
        });
      },
    });
  };

  return (
    <Tooltip disableHoverableContent>
      <TooltipTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          disabled={disabledCompress}
          onClick={handleCompress}
          className='dark:hover:bg-neutral-700/50'
        >
          <Sparkles className='h-4 w-4' />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t('page.compression.process.actions.compress')}</TooltipContent>
    </Tooltip>
  );
}

export default memo(ToolbarCompress);
