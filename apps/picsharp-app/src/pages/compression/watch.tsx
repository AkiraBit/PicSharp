import { useEffect, useRef } from 'react';
import { UnwatchFn } from '@tauri-apps/plugin-fs';
import { isFunction, debounce } from 'radash';
import useCompressionStore from '@/store/compression';
import WatchFileManager from './watch-file-manager';
import { getFilename, parsePaths, humanSize } from '@/utils/fs';
import { watchFolder } from '@/utils/fs-watch';
import { CompressionOutputMode, VALID_IMAGE_EXTS } from '@/constants';
import { isValidArray, correctFloat } from '@/utils';
import Compressor, { ICompressor } from '@/utils/compressor';
import { SettingsKey } from '@/constants';
import { isString } from 'radash';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';
import useSettingsStore from '@/store/settings';
import { useNavigate } from '../../hooks/useNavigate';
import { message } from '@tauri-apps/plugin-dialog';
import { sendTextNotification } from '@/utils/notification';
import { appCacheDir, join } from '@tauri-apps/api/path';
import useAppStore from '@/store/app';
import { convertFileSrc } from '@tauri-apps/api/core';
function CompressionWatch() {
  const navigate = useNavigate();
  const queueRef = useRef<string[]>([]);
  const t = useI18n();

  const handleCompress = async (files: FileInfo[]) => {
    try {
      const { sidecar } = useAppStore.getState();
      const { fileMap, eventEmitter } = useCompressionStore.getState();

      const {
        [SettingsKey.TinypngApiKeys]: tinypngApiKeys,
        [SettingsKey.CompressionMode]: compressionMode,
        [SettingsKey.CompressionOutput]: outputMode,
        [SettingsKey.CompressionOutputSaveToFolder]: saveToFolder,
        [SettingsKey.CompressionOutputSaveAsFileSuffix]: saveAsFileSuffix,
        [SettingsKey.CompressionThresholdEnable]: thresholdEnable,
        [SettingsKey.CompressionThresholdValue]: thresholdValue,
        [SettingsKey.CompressionLevel]: compressionLevel,
        [SettingsKey.CompressionType]: compressionType,
      } = useSettingsStore.getState();

      eventEmitter.emit('update_file_item', 'all');

      let fulfilled = 0;
      let rejected = 0;
      const tempDir = await join(await appCacheDir(), 'picsharp_temp');
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
        tempDir,
        sidecarDomain: sidecar?.origin,
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
          } else {
            rejected++;
            targetFile.status = ICompressor.Status.Failed;
            targetFile.errorMessage = 'Process failed,Please try again';
          }
          eventEmitter.emit('update_file_item', targetFile.path);
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
        },
      );
      toast.info(
        t('tips.compress_completed', {
          fulfilled,
          rejected,
          total: files.length,
        }),
        {
          richColors: true,
        },
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
      toast.error(t('common.compress_failed_msg'), {
        richColors: true,
      });
      sendTextNotification(
        `PicSharp - ${t('common.compress_failed')}`,
        t('common.compress_failed_msg'),
      );
    }
  };

  const throttledProcessData = debounce({ delay: 1000 }, () => {
    if (isValidArray(queueRef.current)) {
      parsePaths(queueRef.current, VALID_IMAGE_EXTS)
        .then((candidates) => {
          if (isValidArray(candidates)) {
            const { files, setFiles } = useCompressionStore.getState();
            setFiles([
              ...files,
              ...candidates.map((item) => ({
                ...item,
                status: ICompressor.Status.Processing,
              })),
            ]);
            handleCompress(candidates);
          }
        })
        .catch((err) => {
          console.error('err', err);
        });
      queueRef.current = [];
    }
  });

  useEffect(() => {
    const { watchingFolder, reset } = useCompressionStore.getState();
    if (!watchingFolder) {
      reset();
      navigate('/compression/watch/guide');
      return;
    }
    let unWatch: UnwatchFn | null = null;
    const handleWatch = async () => {
      unWatch = await watchFolder(watchingFolder, {
        onCreate: (type, paths) => {
          const settingsState = useSettingsStore.getState();
          const compressionState = useCompressionStore.getState();
          if (type === 'file') {
            if (settingsState.compression_output === CompressionOutputMode.SaveAsNewFile) {
              paths.forEach((p) => {
                const filename = getFilename(p);
                if (
                  !compressionState.fileMap.has(p) &&
                  !filename.endsWith(settingsState.compression_output_save_as_file_suffix)
                ) {
                  queueRef.current.push(p);
                }
              });
            } else {
              paths.forEach((p) => {
                if (!compressionState.fileMap.has(p)) {
                  queueRef.current.push(p);
                }
              });
            }
            throttledProcessData();
          }
        },
        onRemove: async (type, paths) => {
          if (type === 'folder' && paths.includes(watchingFolder)) {
            await message(t('tips.watch_folder_deleted'), {
              title: t('tips.warning'),
              kind: 'warning',
            });
            reset();
            navigate('/compression/watch/guide');
          }
        },
        onRename: async (from, to) => {
          if (from === watchingFolder) {
            await message(t('tips.watch_folder_moved_or_renamed'), {
              title: t('tips.warning'),
              kind: 'warning',
            });
            reset();
            navigate('/compression/watch/guide');
          }
        },
        onMove: async (to) => {
          if (to === watchingFolder) {
            await message(t('tips.watch_folder_moved_or_renamed'), {
              title: t('tips.warning'),
              kind: 'warning',
            });
            reset();
            navigate('/compression/watch/guide');
          }
        },
      });
    };
    handleWatch();
    return () => {
      isFunction(unWatch) && unWatch();
    };
  }, []);

  return (
    <div className='h-full'>
      <WatchFileManager />
    </div>
  );
}

export default CompressionWatch;
