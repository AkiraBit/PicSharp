import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { Minus, Square, Copy, Maximize2, Minimize2, Pin, PinOff, X } from 'lucide-react';
import { useI18n } from '@/i18n';
import { UnlistenFn } from '@tauri-apps/api/event';
import { Separator } from './ui/separator';

export interface WindowControlProps {
  className?: string;
  showFullscreen?: boolean;
  showAlwaysOnTop?: boolean;
  showControls?: boolean;
  onClose?: () => void;
  onMinimize?: () => void;
  onToggleMaximize?: (isMaximized: boolean) => void;
  onToggleFullscreen?: (isFullscreen: boolean) => void;
  onToggleAlwaysOnTop?: (isOnTop: boolean) => void;
}

export default function WindowControl({
  className,
  showFullscreen = true,
  showAlwaysOnTop = true,
  showControls = true,
  onClose,
  onMinimize,
  onToggleMaximize,
  onToggleFullscreen,
  onToggleAlwaysOnTop,
}: WindowControlProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
  const t = useI18n();

  const syncStates = useCallback(async () => {
    const win = getCurrentWebviewWindow();
    try {
      const [maxed, full] = await Promise.all([win.isMaximized(), win.isFullscreen()]);
      setIsMaximized(!!maxed);
      setIsFullscreen(!!full);
    } catch (error) {
      console.error('[window-control] syncStates error', error);
    }
  }, []);

  useEffect(() => {
    let unlistenResize: UnlistenFn | null = null;
    (async () => {
      const win = getCurrentWebviewWindow();
      await syncStates();
      try {
        const un = await win.onResized(() => {
          syncStates();
        });
        unlistenResize = un;
      } catch (error) {
        console.error('onResized error', error);
      }
    })();
    return () => {
      if (unlistenResize) unlistenResize();
    };
  }, [syncStates]);

  const handleMinimize = useCallback(async () => {
    try {
      await getCurrentWebviewWindow().minimize();
      onMinimize?.();
    } catch (error) {
      console.error('[window-control] handleMinimize error', error);
    }
  }, [onMinimize]);

  const handleClose = useCallback(async () => {
    try {
      await getCurrentWebviewWindow().close();
      onClose?.();
    } catch (error) {
      console.error('[window-control] handleClose error', error);
    }
  }, [onClose]);

  const handleToggleMaximize = useCallback(async () => {
    const win = getCurrentWebviewWindow();
    try {
      const maxed = await win.isMaximized();
      if (maxed) {
        await win.unmaximize();
        setIsMaximized(false);
        onToggleMaximize?.(false);
      } else {
        await win.maximize();
        setIsMaximized(true);
        onToggleMaximize?.(true);
      }
    } catch (error) {
      console.error('[window-control] handleToggleMaximize error', error);
    }
  }, [onToggleMaximize]);

  const handleToggleFullscreen = useCallback(async () => {
    const win = getCurrentWebviewWindow();
    try {
      const full = await win.isFullscreen();
      await win.setFullscreen(!full);
      setIsFullscreen(!full);
      onToggleFullscreen?.(!full);
    } catch (error) {
      console.error('[window-control] handleToggleFullscreen error', error);
    }
  }, [onToggleFullscreen]);

  const handleToggleAlwaysOnTop = useCallback(async () => {
    const next = !isAlwaysOnTop;
    try {
      await getCurrentWebviewWindow().setAlwaysOnTop(next);
      setIsAlwaysOnTop(next);
      onToggleAlwaysOnTop?.(next);
    } catch (error) {
      console.error('[window-control] handleToggleAlwaysOnTop error', error);
    }
  }, [isAlwaysOnTop, onToggleAlwaysOnTop]);

  const handleDoubleClick = useCallback(() => {
    handleToggleMaximize();
  }, [handleToggleMaximize]);

  return (
    <div className={cn('flex items-center gap-1', className)} onDoubleClick={handleDoubleClick}>
      {showFullscreen && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size='icon'
              variant='ghost'
              aria-label={
                isFullscreen
                  ? t('window.controls.exit_fullscreen')
                  : t('window.controls.fullscreen')
              }
              onClick={handleToggleFullscreen}
            >
              {isFullscreen ? <Minimize2 className='size-4' /> : <Maximize2 className='size-4' />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isFullscreen ? t('window.controls.exit_fullscreen') : t('window.controls.fullscreen')}
          </TooltipContent>
        </Tooltip>
      )}

      {showAlwaysOnTop && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size='icon'
              variant='ghost'
              aria-label={
                isAlwaysOnTop
                  ? t('window.controls.cancel_always_on_top')
                  : t('window.controls.always_on_top')
              }
              onClick={handleToggleAlwaysOnTop}
            >
              {isAlwaysOnTop ? (
                <PinOff className='size-4 text-emerald-500' />
              ) : (
                <Pin className='size-4' />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isAlwaysOnTop
              ? t('window.controls.cancel_always_on_top')
              : t('window.controls.always_on_top')}
          </TooltipContent>
        </Tooltip>
      )}
      {showControls && (
        <>
          <Separator orientation='vertical' className='h-4 bg-neutral-200 dark:bg-neutral-700' />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size='icon'
                variant='ghost'
                aria-label={t('window.controls.minimize')}
                onClick={handleMinimize}
              >
                <Minus className='size-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('window.controls.minimize')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size='icon'
                variant='ghost'
                aria-label={
                  isMaximized ? t('window.controls.restore') : t('window.controls.maximize')
                }
                onClick={handleToggleMaximize}
              >
                {isMaximized ? <Copy className='size-4' /> : <Square className='size-4' />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isMaximized ? t('window.controls.restore') : t('window.controls.maximize')}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size='icon'
                variant='ghost'
                aria-label={t('window.controls.close')}
                onClick={handleClose}
                className='hover:bg-red-500 hover:text-white dark:hover:bg-red-600'
              >
                <X className='size-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('window.controls.close')}</TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
}
