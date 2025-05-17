import { ScrollArea } from '@/components/ui/scroll-area';
import { useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { check, Update as IUpdate } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { useState } from 'react';
import { isProd } from '@/utils';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as logger from '@tauri-apps/plugin-log';
import { message } from '@tauri-apps/plugin-dialog';
import { toast } from 'sonner';

const changelog = [
  '新增功能 A，优化用户体验。',
  '修复 Bug B，提升应用稳定性。',
  '改进特性 C，让操作更便捷。',
  '安全更新 D，保障用户数据安全。',
  '安全更新 D，保障用户数据安全。',
  '安全更新 D，保障用户数据安全。',
  '安全更新 D，保障用户数据安全。',
  '安全更新 D，保障用户数据安全。',
  '安全更新 D，保障用户数据安全。',
];

enum UpdateStatus {
  Ready = 'ready',
  Checking = 'checking',
  Checked = 'checked',
  Downloading = 'downloading',
  Finished = 'finished',
}

export default function Update() {
  const [query] = useSearchParams();
  const version = query.get('version');
  const releaseContent = query.get('releaseContent');
  const [status, setStatus] = useState<UpdateStatus>(UpdateStatus.Ready);
  const [progress, setProgress] = useState<number>(0);

  const handleUpdate = async () => {
    let updater: IUpdate | null = null;
    try {
      console.log('Start update');
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
              console.log('download finished');
              setProgress(100);
              break;
          }
        });
        setStatus(UpdateStatus.Finished);
        await message('', {
          title: '安装完成',
          okLabel: '立即重启',
        });
        if (isProd) {
          await relaunch();
        }
      } else {
        setStatus(UpdateStatus.Ready);
      }
    } catch (error) {
      setStatus(UpdateStatus.Ready);
      setProgress(0);
      toast.error('更新失败，请重试', {
        richColors: true,
      });
      console.error('[Update Failed]: ', error);
      if (isProd) {
        logger.error(`[Update Failed]: ${error}`);
      }
    } finally {
      updater?.close();
    }
  };

  return (
    <div className='bg-background flex min-h-screen flex-col items-center justify-center px-4 pb-5 pt-7'>
      <div className='flex w-full flex-1 flex-col rounded-lg bg-white p-5 shadow-xl dark:bg-neutral-800'>
        <h1 className='text-foreground mb-3 text-center text-3xl font-bold'>发现新版本！</h1>

        <div className='mb-3'>
          <h2 className='text-foreground text-xl font-semibold'>版本号：{version}</h2>
        </div>

        <div className='mb-3 flex flex-1 flex-col'>
          <h2 className='text-foreground mb-3 text-lg font-semibold'>更新日志：</h2>
          <ScrollArea>
            <ul className='text-foreground max-h-[220px] flex-grow-0 list-inside list-disc space-y-2 overflow-y-auto rounded-md p-4 py-3 dark:bg-neutral-700'>
              {changelog.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </ScrollArea>
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
            {status === UpdateStatus.Ready && '立即更新'}
            {(status === UpdateStatus.Checking || status === UpdateStatus.Checked) && (
              <>
                <Loader2 className='h-4 w-4 animate-spin' />
                正在校验
              </>
            )}
            {status === UpdateStatus.Finished && '安装完成，立即重启'}
          </Button>
        </div>
      </div>
    </div>
  );
}
