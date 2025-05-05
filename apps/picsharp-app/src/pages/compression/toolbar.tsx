import { memo } from 'react';
import ToolbarCompress from './toolbar-compress';
import { Separator } from '@/components/ui/separator';
import ToolbarReset from './toolbar-exit';
import ToolbarInfo from './toolbar-info';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { TooltipProvider } from '@/components/ui/tooltip';
export interface ToolbarProps {
  mode: 'classic' | 'watch';
}

function Toolbar(props: ToolbarProps) {
  const { mode } = props;
  return (
    <TooltipProvider delayDuration={100}>
      <div className='mx-auto max-w-sm rounded-xl border bg-background px-2 py-1 shadow-lg dark:border-neutral-600 dark:bg-neutral-800'>
        <div className='flex items-center justify-center gap-2'>
          <ToolbarInfo />
          {mode === 'classic' && (
            <>
              <Separator orientation='vertical' />
              <ToolbarCompress />
            </>
          )}
          {getCurrentWebviewWindow().label === 'main' && (
            <>
              <Separator orientation='vertical' />
              <ToolbarReset mode={mode} />
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default memo(Toolbar);
