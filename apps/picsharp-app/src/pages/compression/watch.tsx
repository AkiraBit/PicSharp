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
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useReport } from '@/hooks/useReport';
import { captureError } from '@/utils';

function CompressionWatch() {
  const { progressRef } = useContext(CompressionContext);
  const navigate = useNavigate();
  const queueRef = useRef<string[]>([]);
  const t = useI18n();
  const { messageApi } = useContext(AppContext);
  const isFirstInit = useRef(true);
  const historys = useRef<Set<string>>(new Set());
  const ctrlRef = useRef<AbortController | null>(null);
  const r = useReport();

  const handleCompress = async (files: FileInfo[]) => {
    let fulfilled = 0;
    let rejected = 0;
    const rejectedList = [];
    let startTime = Date.now();
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
        [SettingsKey.CompressionConvertEnable]: convertEnable,
        [SettingsKey.CompressionConvert]: convertTypes,
        [SettingsKey.CompressionConvertAlpha]: convertAlpha,
        [SettingsKey.CompressionResizeEnable]: resizeEnable,
        [SettingsKey.CompressionResizeDimensions]: resizeDimensions,
        [SettingsKey.CompressionResizeFit]: resizeFit,
        [SettingsKey.CompressionWatermarkType]: watermarkType,
        [SettingsKey.CompressionWatermarkPosition]: watermarkPosition,
        [SettingsKey.CompressionWatermarkText]: watermarkText,
        [SettingsKey.CompressionWatermarkTextColor]: watermarkTextColor,
        [SettingsKey.CompressionWatermarkFontSize]: watermarkFontSize,
        [SettingsKey.CompressionWatermarkImagePath]: watermarkImagePath,
        [SettingsKey.CompressionWatermarkImageOpacity]: watermarkImageOpacity,
        [SettingsKey.CompressionWatermarkImageScale]: watermarkImageScale,
        [SettingsKey.CompressionKeepMetadata]: keepMetadata,
      } = useSettingsStore.getState();

      eventEmitter.emit('update_file_item', 'all');

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
        convertEnable,
        convertTypes,
        convertAlpha,
        resizeDimensions,
        resizeEnable,
        resizeFit,
        watermarkType,
        watermarkPosition,
        watermarkText,
        watermarkTextColor,
        watermarkFontSize,
        watermarkImagePath,
        watermarkImageOpacity,
        watermarkImageScale,
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
            targetFile.originalTempPath = res.original_temp_path;
            targetFile.originalTempPathConverted = convertFileSrc(res.original_temp_path);
            targetFile.saveType = outputMode;
            historys.current.add(res.hash);
            if (isValidArray(res.convert_results)) {
              targetFile.convertResults = res.convert_results;
            }
          } else {
            rejected++;
            rejectedList.push(res.input_path);
            targetFile.status = ICompressor.Status.Failed;
            targetFile.errorMessage = 'Process failed,Please try again';
            r('watch_compress_result', {
              success: false,
              err_msg: 'After compression, cannot find target file',
            });
          }
          eventEmitter.emit('update_file_item', targetFile.path);
        },
        (res) => {
          rejected++;
          rejectedList.push(res.input_path);
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
      r('watch_compress_result', {
        success: true,
        fulfilled,
        rejected,
        total: files.length,
        rejectedList: rejectedList.slice(0, 10),
        costTime: Date.now() - startTime,
      });
    } catch (error) {
      captureError(error);
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
        .catch((error) => {
          captureError(error);
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

  function regain() {
    const { reset } = useCompressionStore.getState();
    ctrlRef.current?.abort();
    reset();
    navigate('/compression/watch/guide');
    progressRef.current?.done();
  }

  useEffect(() => {
    const { watchingFolder } = useCompressionStore.getState();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
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
            getCurrentWebviewWindow().show();
            getCurrentWebviewWindow().setFocus();
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
              getCurrentWebviewWindow().show();
              getCurrentWebviewWindow().setFocus();
            }
          }, 1000);
          captureError(error);
        },
        onclose() {
          console.log('[Sidecar] Watch EventSource closed');
          regain();
          if (isFirstInit.current) {
            alert(t('tips.watch_service_startup_failed'));
          } else {
            alert(t('tips.file_watch_abort'));
          }
          getCurrentWebviewWindow().show();
          getCurrentWebviewWindow().setFocus();
        },
      });
    }
    function handlePageVisible() {
      if (document.visibilityState === 'visible') {
        if (ctrl.signal.aborted && !isFirstInit.current) {
          regain();
          alert(t('tips.file_watch_abort'));
          getCurrentWebviewWindow().show();
          getCurrentWebviewWindow().setFocus();
        }
      }
    }
    if (!watchingFolder) {
      regain();
      alert(t('tips.file_watch_abort'));
      getCurrentWebviewWindow().show();
      getCurrentWebviewWindow().setFocus();
      return;
    }
    handleWatch();
    window.addEventListener('visibilitychange', handlePageVisible);
    return () => {
      ctrl.abort();
      ctrlRef.current = null;
      window.removeEventListener('visibilitychange', handlePageVisible);
    };
  }, []);

  useEffect(() => {
    const { watchingFolder } = useCompressionStore.getState();
    r('watch_imp', {
      has_folder: !!watchingFolder,
    });
  }, []);

  return (
    <div className='h-full'>
      <WatchFileManager />
    </div>
  );
}

export default CompressionWatch;
