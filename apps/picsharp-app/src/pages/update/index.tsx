import { useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { check, Update as IUpdate } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { useState, memo, useEffect, useContext } from 'react';
import { isMac, isProd, isWindows } from '@/utils';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { message } from '@tauri-apps/plugin-dialog';
import { useI18n } from '@/i18n';
import { marked } from 'marked';
import useAppStore from '@/store/app';
import { invoke } from '@tauri-apps/api/core';
import { AppContext } from '@/routes';
import WindowControl from '@/components/window-control';
import { useReport } from '@/hooks/useReport';
import { captureError } from '@/utils';
import { UpdateError } from '@/extends/UpdateError';

enum UpdateStatus {
  Ready = 'ready',
  Checking = 'checking',
  Checked = 'checked',
  Downloading = 'downloading',
  Finished = 'finished',
}

const ReleaseNotes = memo(function ReleaseNotes({ data }: { data: string }) {
  const [html, setHtml] = useState<string>('');
  useEffect(() => {
    const html = marked.parse(data);
    setHtml(html as string);
  }, [data]);
  return <div className='markdown-body' dangerouslySetInnerHTML={{ __html: html }} />;
});

export default function Update() {
  const [query] = useSearchParams();
  const version = query.get('version');
  const releaseContent = query.get('releaseContent') || '';
  const [status, setStatus] = useState<UpdateStatus>(UpdateStatus.Ready);
  const [progress, setProgress] = useState<number>(0);
  const t = useI18n();
  const { messageApi } = useContext(AppContext);
  const r = useReport();

  const handleUpdate = async () => {
    let updater: IUpdate | null = null;
    try {
      if (status !== UpdateStatus.Ready) return;
      setStatus(UpdateStatus.Checking);
      updater = await check();
      setStatus(UpdateStatus.Checked);
      if (updater) {
        let downloaded = 0;
        let contentLength = 0;
        let lastLogged = 0;
        setProgress(0);
        setStatus(UpdateStatus.Downloading);
        await updater.downloadAndInstall?.((event) => {
          switch (event.event) {
            case 'Started':
              contentLength = event.data.contentLength!;
              break;
            case 'Progress':
              downloaded += event.data.chunkLength;
              const percent = Math.floor((downloaded / contentLength) * 100);
              setProgress(percent);
              if (downloaded - lastLogged >= 1 * 1024 * 1024) {
                console.log(`downloaded ${downloaded} bytes from ${contentLength}`);
                lastLogged = downloaded;
              }
              break;
            case 'Finished':
              setProgress(100);
              break;
          }
        });
        setStatus(UpdateStatus.Finished);
        await message('', {
          title: t('update.message.installed'),
          okLabel: t('update.button.restart'),
        });
        if (isProd) {
          useAppStore
            .getState()
            .destroySidecar()
            .finally(async () => {
              if (isWindows) {
                invoke('ipc_kill_picsharp_sidecar_processes').finally(() => {
                  window.localStorage.setItem('updated_relaunch', version);
                  r('update_done', {
                    success: true,
                    target: version,
                  });
                  setTimeout(() => {
                    relaunch();
                  }, 1000);
                });
              } else {
                window.localStorage.setItem('updated_relaunch', version);
                r('update_done', {
                  success: true,
                  target: version,
                });
                setTimeout(() => {
                  relaunch();
                }, 1000);
              }
            });
        }
      } else {
        setStatus(UpdateStatus.Ready);
      }
    } catch (error) {
      setStatus(UpdateStatus.Ready);
      setProgress(0);
      messageApi?.error(t('update.message.failed'));
      captureError(
        new UpdateError(`Update Error: ${error.message}`, error),
        undefined,
        'Update-Failed',
      );
      r('update_done', {
        success: false,
        target: version,
      });
    } finally {
      updater?.close();
    }
  };

  useEffect(() => {
    r('update_imp');
  }, []);

  return (
    <div className='flex min-h-screen w-screen flex-col items-center justify-center'>
      <div className='flex h-[48px] w-full items-center justify-between' data-tauri-drag-region>
        <div></div>
        <WindowControl showControls={!isMac} showFullscreen={false} showAlwaysOnTop={false} />
      </div>
      <div className='flex w-full flex-1 flex-col rounded-lg px-3 pb-4 pt-0'>
        <h1 className='text-foreground mb-3 text-center text-3xl font-bold'>{t('update.title')}</h1>

        <div className='mb-3'>
          <h2 className='text-foreground text-xl font-semibold'>
            {t('update.version', { version })}
          </h2>
        </div>

        <div className='mb-3 flex flex-1 flex-col'>
          <h2 className='text-foreground mb-3 text-lg font-semibold'>{t('update.changelog')}</h2>
          <div className='text-foreground h-[220px] w-full flex-grow-0 list-inside list-disc space-y-2 overflow-y-auto rounded-md p-4 py-3 dark:bg-neutral-900'>
            {releaseContent.split('\n').map((line, index) => (
              <div key={index} className='w-full break-all'>
                {line}
              </div>
            ))}
          </div>
        </div>
        <div className='relative w-full'>
          <div
            className={cn(
              'absolute inset-0 z-10 flex w-full items-center justify-center opacity-0 transition-opacity duration-300',
              {
                'opacity-100': status === UpdateStatus.Downloading,
              },
            )}
          >
            <Progress value={progress} max={100} />
          </div>
          <Button
            onClick={handleUpdate}
            className={cn(
              'relative z-20 w-full text-lg font-bold transition-opacity duration-300',
              {
                '!opacity-0': status === UpdateStatus.Downloading,
                'pointer-events-none': status !== UpdateStatus.Ready,
              },
            )}
            disabled={status !== UpdateStatus.Ready}
          >
            {status === UpdateStatus.Ready && t('update.button.update')}
            {(status === UpdateStatus.Checking || status === UpdateStatus.Checked) && (
              <>
                <Loader2 className='h-4 w-4 animate-spin' />
                {t('update.button.update')}
              </>
            )}
            {status === UpdateStatus.Finished && t('update.button.restart')}
          </Button>
        </div>
      </div>
    </div>
  );
}
