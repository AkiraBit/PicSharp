import { memo, useRef, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, LoaderPinwheel } from 'lucide-react';
import useAppStore from '@/store/app';
import useCompressionStore from '@/store/compression';
import useSelector from '@/hooks/useSelector';
import { SettingsKey, CompressionMode, CompressionOutputMode } from '@/constants';
import { isValidArray, correctFloat, calProgress } from '@/utils';
import Compressor from '@/utils/compressor';
import { humanSize } from '@/utils/fs';
import { isString } from 'radash';
import { useI18n } from '@/i18n';
import useSettingsStore from '@/store/settings';
import { sendTextNotification } from '@/utils/notification';
import { useNavigate } from '@/hooks/useNavigate';
import { ICompressor } from '@/utils/compressor';
import { cn } from '@/lib/utils';
import { convertFileSrc } from '@tauri-apps/api/core';
import message from '@/components/message';
import { createWebviewWindow } from '@/utils/window';
import { AppContext } from '@/routes';

function ToolbarCompress() {
  const { sidecar, imageTempDir } = useAppStore(useSelector(['sidecar', 'imageTempDir']));
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
    [SettingsKey.CompressionConvert]: convertTypes,
    [SettingsKey.CompressionConvertAlpha]: convertAlpha,
    [SettingsKey.CompressionKeepMetadata]: keepMetadata,
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
      SettingsKey.CompressionConvert,
      SettingsKey.CompressionConvertAlpha,
      SettingsKey.CompressionKeepMetadata,
    ]),
  );
  const navigate = useNavigate();
  const t = useI18n();
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const { messageApi } = useContext(AppContext);
  const disabledCompress =
    !files.length ||
    inCompressing ||
    !selectedFiles.some(
      (file) =>
        fileMap.get(file)?.status === ICompressor.Status.Pending ||
        fileMap.get(file)?.status === ICompressor.Status.Failed ||
        fileMap.get(file)?.status === ICompressor.Status.Undone,
    );

  const handleCompress = async () => {
    try {
      if (compressionMode !== CompressionMode.Local && !isValidArray(tinypngApiKeys)) {
        const result = await message.confirm({
          title: t('tips.tinypng_api_keys_not_configured'),
          confirmText: t('goToSettings'),
          cancelText: t('cancel'),
        });
        if (result) {
          createWebviewWindow('settings', {
            url: '/settings/tinypng#tinypng-api-keys',
            title: t('nav.settings'),
            width: 796,
            height: 528,
            minWidth: 796,
            minHeight: 528,
            center: true,
            resizable: true,
            titleBarStyle: 'overlay',
            hiddenTitle: true,
            dragDropEnabled: true,
            minimizable: true,
            maximizable: true,
          });
        }
        return;
      }

      if (outputMode === CompressionOutputMode.SaveToNewFolder && !saveToFolder) {
        const result = await message.confirm({
          title: t('tips.save_to_folder_not_configured'),
          confirmText: t('goToSettings'),
          cancelText: t('cancel'),
        });
        if (result) {
          createWebviewWindow('settings', {
            url: '/settings/compression#output',
            title: t('nav.settings'),
            width: 796,
            height: 528,
            minWidth: 796,
            minHeight: 528,
            center: true,
            resizable: true,
            titleBarStyle: 'overlay',
            hiddenTitle: true,
            dragDropEnabled: true,
            minimizable: true,
            maximizable: true,
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
            (file.status === ICompressor.Status.Pending ||
              file.status === ICompressor.Status.Failed ||
              file.status === ICompressor.Status.Undone)
          ) {
            file.status = ICompressor.Status.Processing;
            return file;
          }
        })
        .filter(Boolean);

      eventEmitter.emit('update_file_item', 'all');

      let fulfilled = 0;
      let rejected = 0;
      await new Compressor({
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
        tempDir: imageTempDir,
        sidecarDomain: sidecar?.origin,
        convertTypes,
        convertAlpha,
        keepMetadata: keepMetadata,
      }).compress(
        files,
        (res) => {
          const targetFile = fileMap.get(res.input_path);
          if (targetFile) {
            fulfilled++;
            targetFile.status = ICompressor.Status.Completed;
            if (res.compression_rate > 0) {
              targetFile.compressedBytesSize = res.output_size;
              targetFile.compressedDiskSize = res.output_size;
              targetFile.formattedCompressedBytesSize = humanSize(res.output_size);
              targetFile.compressRate = `${correctFloat(res.compression_rate * 100)}%`;
              targetFile.ssim = res.ssim;
            } else {
              targetFile.compressedBytesSize = targetFile.bytesSize;
              targetFile.compressedDiskSize = targetFile.diskSize;
              targetFile.formattedCompressedBytesSize = humanSize(targetFile.bytesSize);
              targetFile.compressRate = '0%';
            }
            targetFile.assetPath = convertFileSrc(res.output_path);
            targetFile.outputPath = res.output_path;
            targetFile.originalTempPath = convertFileSrc(res.original_temp_path);
            targetFile.saveType = outputMode;
            if (isValidArray(res.convert_results)) {
              targetFile.convertResults = res.convert_results;
            }
          } else {
            rejected++;
            targetFile.status = ICompressor.Status.Failed;
            targetFile.errorMessage = 'Process failed,Please try again';
          }
          eventEmitter.emit('update_file_item', targetFile.path);
          if (indicatorRef.current) {
            indicatorRef.current.textContent = `${calProgress(fulfilled + rejected, files.length)}%`;
          }
        },
        (res) => {
          rejected++;
          const targetFile = fileMap.get(res.input_path);
          if (targetFile) {
            targetFile.status = ICompressor.Status.Failed;
            if (isString(res.error)) {
              targetFile.errorMessage = res.error;
            } else {
              targetFile.errorMessage = res.error.toString();
            }
            eventEmitter.emit('update_file_item', targetFile.path);
          }
          if (indicatorRef.current) {
            indicatorRef.current.textContent = `${calProgress(fulfilled + rejected, files.length)}%`;
          }
        },
      );
      messageApi?.success(
        t('tips.compress_completed', {
          fulfilled,
          rejected,
          total: files.length,
        }),
      );
      sendTextNotification(
        `PicSharp - ${t('common.compress_completed')}`,
        t('tips.compress_completed', {
          fulfilled,
          rejected,
          total: files.length,
        }),
      );
    } catch (_) {
      messageApi?.error(t('common.compress_failed_msg'));
      sendTextNotification(
        `PicSharp - ${t('common.compress_failed')}`,
        t('common.compress_failed_msg'),
      );
    } finally {
      if (indicatorRef.current) {
        indicatorRef.current.textContent = '0%';
      }
      setInCompressing(false);
    }
  };

  return (
    <Button size='sm' disabled={disabledCompress} onClick={handleCompress} className='relative'>
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity duration-300',
          inCompressing && 'opacity-100',
        )}
      >
        <LoaderPinwheel className='h-4 w-4 animate-spin' />
        <span ref={indicatorRef}>0%</span>
      </div>
      <div
        className={cn(
          'flex items-center justify-center gap-2 transition-opacity duration-300',
          inCompressing && 'opacity-0',
        )}
      >
        <Sparkles className='h-4 w-4' />
        <span>{t('common.start')}</span>
      </div>
    </Button>
  );
}

export default memo(ToolbarCompress);
