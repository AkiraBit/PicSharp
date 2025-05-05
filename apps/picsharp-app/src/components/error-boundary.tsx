import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from 'antd';
import { Translation } from 'react-i18next';
import * as logger from '@tauri-apps/plugin-log';

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
    logger.error(`Error Boundary Caught Error:
      Message: ${error.message}
      Stack: ${error.stack}
      Component Stack: ${errorInfo.componentStack}
    `);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className='flex h-screen w-full flex-col items-center justify-center p-4'>
          <div className='flex flex-col items-center space-y-4 text-center'>
            {/* <XCircle className="h-16 w-16 text-destructive" /> */}
            <h2 className='text-2xl font-semibold text-foreground'>
              {/* @ts-ignore */}
              <Translation>{(t) => t('error.something_went_wrong')}</Translation>
            </h2>
            <p className='text-muted-foreground'>
              {/* @ts-ignore */}
              <Translation>{(t) => t('error.unexpected_error')}</Translation>
            </p>
            <Button variant='filled' onClick={() => window.location.reload()} className='mt-4'>
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
