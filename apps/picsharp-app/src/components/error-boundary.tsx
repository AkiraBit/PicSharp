import { Component, ErrorInfo, ReactNode } from 'react';
import { Translation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { captureError } from '@/utils';
import { reloadApp } from '@/utils';
import { toast } from 'sonner';
import { sleep } from '@/utils';
import { t } from '@/i18n';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: undefined,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    captureError(
      error,
      {
        errorInfo: errorInfo,
      },
      'Error-Boundary',
    );
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className='flex h-screen w-screen flex-col items-center justify-center p-4'>
          <div className='fixed left-0 top-0 z-[999] h-[48px] w-full' data-tauri-drag-region></div>
          <div className='flex flex-col items-center space-y-4 text-center'>
            {/* <XCircle className="h-16 w-16 text-destructive" /> */}
            <h2 className='text-foreground text-2xl font-semibold'>
              {/* @ts-ignore */}
              <Translation>{(t) => t('error.something_went_wrong')}</Translation>
            </h2>
            <p className='text-muted-foreground'>
              {/* @ts-ignore */}
              <Translation>{(t) => t('error.unexpected_error')}</Translation>
            </p>
            <Button
              variant='default'
              onClick={async () => {
                try {
                  toast.loading(t('tips.reload_app'), {
                    richColors: true,
                    position: 'top-center',
                  });
                  await sleep(500);
                  await reloadApp();
                } catch (error) {
                  toast.dismiss();
                  toast.error(t('tips.reload_app_failed'), {
                    richColors: true,
                    position: 'top-center',
                  });
                  captureError(error, undefined, 'App-Reload-Failed');
                } finally {
                  toast.dismiss();
                }
              }}
              className='mt-4'
            >
              {/* @ts-ignore */}
              <Translation>{(t) => t('error.refresh_page')}</Translation>
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
