import { useEffect, useRef, useContext, useLayoutEffect } from 'react';
import { isFunction, debounce } from 'radash';
import useCompressionStore from '@/store/compression';
import WatchFileManager from './watch-file-manager';
import { parsePaths, humanSize } from '@/utils/fs';
import { CompressionOutputMode, VALID_IMAGE_EXTS } from '@/constants';
import { isValidArray, correctFloat, sleep, isMac } from '@/utils';
import Compressor, { ICompressor } from '@/utils/compressor';
import { SettingsKey } from '@/constants';
import { isString } from 'radash';
import { useI18n } from '@/i18n';
import useSettingsStore from '@/store/settings';
import { useNavigate } from '../../hooks/useNavigate';
import { sendTextNotification } from '@/utils/notification';
import { appCacheDir, join } from '@tauri-apps/api/path';
import useAppStore from '@/store/app';
import { convertFileSrc } from '@tauri-apps/api/core';
import { AppContext } from '@/routes';
import { CompressionContext } from '.';
import { message as systemMessage } from '@tauri-apps/plugin-dialog';
import { message } from '@/components/message';
import useSelector from '@/hooks/useSelector';

function CompressionWatch() {
  const { progressRef } = useContext(CompressionContext);
  const navigate = useNavigate();
  const queueRef = useRef<string[]>([]);
  const t = useI18n();
  const { messageApi } = useContext(AppContext);
  const isFirstInit = useRef(true);
  const historys = useRef<Set<string>>(new Set());

  const handleCompress = async (files: FileInfo[]) => {
    try {
      const { sidecar, imageTempDir } = useAppStore.getState();
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
        [SettingsKey.CompressionConvert]: convertTypes,
        [SettingsKey.CompressionConvertAlpha]: convertAlpha,
        [SettingsKey.CompressionKeepMetadata]: keepMetadata,
      } = useSettingsStore.getState();

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
        keepMetadata,
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
            historys.current.add(res.hash);
            if (isValidArray(res.convert_results)) {
              targetFile.convertResults = res.convert_results;
            }
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
    } catch (error) {
      console.error('err', error);
      messageApi?.error(t('common.compress_failed_msg'));
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

  const alert = async (title: string, content: string = '') => {
    if (isMac) {
      await systemMessage(content, {
        kind: 'error',
        title,
      });
    } else {
      await message?.error({
        title,
        description: content,
      });
    }
  };

  useEffect(() => {
    let eventSource: EventSource = null;
    const { watchingFolder, reset } = useCompressionStore.getState();
    function regain() {
      reset();
      navigate('/compression/watch/guide');
      progressRef.current?.done();
    }
    async function handleWatch() {
      const { sidecar } = useAppStore.getState();
      eventSource = new EventSource(
        `${sidecar?.origin}/stream/watch/new-images?path=${watchingFolder}`,
      );
      eventSource.onopen = () => {
        console.log('[Sidecar] Watch EventSource opened');
        isFirstInit.current = false;
      };
      eventSource.addEventListener('ready', (event) => {
        console.log('[Sidecar] Watch EventSource ready');
        progressRef.current?.done();
      });
      eventSource.addEventListener('add', (event) => {
        const payload = JSON.parse(event.data);
        const path = payload.fullPath;
        const hash = payload.content_hash;
        console.log('hash', hash);

        if (!historys.current.has(hash)) {
          queueRef.current.push(path);
        }

        // const settingsState = useSettingsStore.getState();
        // const compressionState = useCompressionStore.getState();
        // if (settingsState.compression_output === CompressionOutputMode.SaveAsNewFile) {
        //   const filename = payload.name;
        //   if (
        //     !compressionState.fileMap.has(path) &&
        //     !filename.endsWith(settingsState.compression_output_save_as_file_suffix)
        //   ) {
        //     queueRef.current.push(path);
        //   }
        // } else {
        //   if (!compressionState.fileMap.has(path)) {
        //     queueRef.current.push(path);
        //   }
        // }
        throttledProcessData();
      });
      eventSource.addEventListener('self-enoent', async () => {
        console.log('[Sidecar] Watch EventSource self-enoent');
        eventSource?.close();
        regain();
        alert(t('tips.file_watch_target_changed'));
      });
      eventSource.addEventListener('fault', async (event) => {
        console.log('[Sidecar] Watch EventSource fault', event);
      });
      eventSource.addEventListener('error', async (event) => {
        console.log('[Sidecar] Watch EventSource error', event);
        await sleep(1000);
        regain();
        if (isFirstInit.current) {
          isFirstInit.current = false;
          messageApi?.error(t('tips.file_watch_not_running'));
        } else {
          alert(t('tips.file_watch_abort'));
        }
      });
    }
    function handlePageVisible() {
      if (document.visibilityState === 'visible') {
        if (eventSource.readyState === EventSource.CLOSED && !isFirstInit.current) {
          regain();
          alert(t('tips.file_watch_abort'));
        }
      }
    }
    if (!watchingFolder) {
      regain();
      return;
    }
    handleWatch();
    window.addEventListener('visibilitychange', handlePageVisible);
    return () => {
      eventSource?.close();
      window.removeEventListener('visibilitychange', handlePageVisible);
    };
  }, []);

  return (
    <div className='h-full'>
      <WatchFileManager />
    </div>
  );
}

export default CompressionWatch;
