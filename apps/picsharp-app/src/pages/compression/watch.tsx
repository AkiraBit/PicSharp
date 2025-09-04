import { useEffect, useRef, useContext } from 'react';
import { debounce } from 'radash';
import useCompressionStore from '@/store/compression';
import WatchFileManager from './watch-file-manager';
import { parsePaths, humanSize } from '@/utils/fs';
import { VALID_IMAGE_EXTS } from '@/constants';
import { isValidArray, correctFloat } from '@/utils';
import Compressor, { ICompressor } from '@/utils/compressor';
import { SettingsKey } from '@/constants';
import { isString } from 'radash';
import { useI18n } from '@/i18n';
import useSettingsStore from '@/store/settings';
import { useNavigate } from '../../hooks/useNavigate';
import { sendTextNotification } from '@/utils/notification';
import useAppStore from '@/store/app';
import { convertFileSrc } from '@tauri-apps/api/core';
import { AppContext } from '@/routes';
import { CompressionContext } from '.';
import { message } from '@/components/message';
import { fetchEventSource } from '@microsoft/fetch-event-source';

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
        t('common.compress_completed'),
        t('tips.compress_completed', {
          fulfilled,
          rejected,
          total: files.length,
        }),
      );
    } catch (error) {
      console.error('err', error);
      messageApi?.error(t('common.compress_failed_msg'));
      sendTextNotification(t('common.compress_failed'), t('common.compress_failed_msg'));
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
    sendTextNotification(title, content);
    message?.error({
      title,
      description: content,
    });
  };

  useEffect(() => {
    const { watchingFolder, reset } = useCompressionStore.getState();
    const ctrl = new AbortController();
    function regain() {
      ctrl.abort();
      reset();
      navigate('/compression/watch/guide');
      progressRef.current?.done();
    }
    async function handleWatch() {
      const { compression_watch_file_ignore: ignores = [] } = useSettingsStore.getState();
      const { sidecar } = useAppStore.getState();
      fetchEventSource(`${sidecar?.origin}/stream/watch/new-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer picsharp_sidecar`,
        },
        body: JSON.stringify({
          path: watchingFolder,
          ignores,
        }),
        signal: ctrl.signal,
        openWhenHidden: true,
        onopen: async (response) => {
          if (response.ok && response.headers.get('content-type') === 'text/event-stream') {
            console.log('[Sidecar] Watch EventSource opened');
            isFirstInit.current = false;
          } else {
            alert(t('tips.watch_service_startup_failed'));
          }
        },
        async onmessage(msg) {
          if (msg.event === 'ready') {
            console.log('[Sidecar] Watch EventSource ready');
            progressRef.current?.done();
          } else if (msg.event === 'add') {
            const payload = JSON.parse(msg.data);
            const path = payload.fullPath;
            const hash = payload.content_hash;

            if (!historys.current.has(hash)) {
              queueRef.current.push(path);
            }
            throttledProcessData();
          } else if (msg.event === 'self-enoent') {
            console.log('[Sidecar] Watch EventSource self-enoent');
            ctrl.abort();
            regain();
            alert(t('tips.file_watch_target_changed'));
          } else if (msg.event === 'fault') {
            console.log('[Sidecar] Watch EventSource fault', msg);
          }
        },
        onerror(error) {
          console.log('[Sidecar] Watch EventSource error', error);
          setTimeout(() => {
            if (!ctrl.signal.aborted) {
              regain();
              if (isFirstInit.current) {
                alert(t('tips.watch_service_startup_failed'));
              } else {
                alert(t('tips.file_watch_abort'));
              }
            }
          }, 1000);
        },
        onclose() {
          regain();
        },
      });
    }
    function handlePageVisible() {
      if (document.visibilityState === 'visible') {
        if (ctrl.signal.aborted && !isFirstInit.current) {
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
      ctrl.abort();
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
