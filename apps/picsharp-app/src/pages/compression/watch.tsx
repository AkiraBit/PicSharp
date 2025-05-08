import { useEffect, useRef } from 'react';
import { UnwatchFn } from '@tauri-apps/plugin-fs';
import { isFunction, debounce } from 'radash';
import useCompressionStore from '@/store/compression';
import WatchFileManager from './watch-file-manager';
import { getFilename, parsePaths, humanSize } from '@/utils/fs';
import { watchFolder } from '@/utils/fs-watch';
import { SettingsCompressionTaskConfigOutputMode, VALID_IMAGE_EXTS } from '@/constants';
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
function CompressionWatch() {
  const navigate = useNavigate();
  const queueRef = useRef<string[]>([]);
  const t = useI18n();

  const handleCompress = async (files: FileInfo[]) => {
    const { sidecar } = useAppStore.getState();
    const { fileMap, eventEmitter } = useCompressionStore.getState();
    const {
      [SettingsKey.compression_tinypng_api_keys]: tinypngApiKeys,
      [SettingsKey.compression_tasks_concurrency]: concurrency,
      [SettingsKey.compression_action]: compressionAction,
      [SettingsKey.compression_tasks_output_mode]: outputMode,
      [SettingsKey.compression_tasks_output_mode_save_to_folder]: saveToFolder,
      [SettingsKey.compression_tasks_output_mode_save_as_file_suffix]: saveAsFileSuffix,
      [SettingsKey.compression_tasks_save_compress_rate_limit]: saveCompressRateLimit,
      [SettingsKey.compression_tasks_save_compress_rate_limit_threshold]:
        saveCompressRateLimitThreshold,
      [SettingsKey.compression_local_quality_level]: compressionLevel,
      [SettingsKey.compression_local_quality_mode]: compressionMode,
    } = useSettingsStore.getState();

    eventEmitter.emit('update_file_item', 'all');

    const toastId = toast('Compress');
    let fulfilled = 0;
    let rejected = 0;

    const appCacheDirPath = await appCacheDir();
    const tempDir = await join(appCacheDirPath, 'picsharp_temp');

    const compressor = new Compressor({
      concurrency,
      action: compressionAction,
      limitCompressRate: saveCompressRateLimit ? saveCompressRateLimitThreshold : undefined,
      tinifyApiKeys: tinypngApiKeys.map((key) => key.api_key),
      compressionLevel: compressionLevel,
      compressionMode: compressionMode,
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
          eventEmitter.emit('update_file_item', targetFile.path);
        }
      },
      (res) => {
        console.error('#2', res);
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
            if (
              settingsState.compression_tasks_output_mode ===
              SettingsCompressionTaskConfigOutputMode.SaveAsNewFile
            ) {
              paths.forEach((p) => {
                const filename = getFilename(p);
                if (
                  !compressionState.fileMap.has(p) &&
                  !filename.endsWith(
                    settingsState.compression_tasks_output_mode_save_as_file_suffix,
                  )
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
