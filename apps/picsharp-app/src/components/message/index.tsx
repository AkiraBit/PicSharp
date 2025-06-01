import * as React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import ReactDOM from 'react-dom/client';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { useState } from 'react';
import { Loader2, Info, CheckCircle, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';

// 对话框类型定义
export type MessageType = 'info' | 'success' | 'error' | 'warning' | 'confirm';

// 对话框配置接口
export interface MessageConfig {
  type: MessageType;
  title: string;
  description?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
  showCancel?: boolean;
}

// 基础对话框组件接口
export interface MessageDialogProps extends MessageConfig {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}

// 图标映射
const iconMap = {
  info: Info,
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  confirm: HelpCircle,
} as const;

// 图标颜色映射
const iconColorMap = {
  info: 'text-blue-500',
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  confirm: 'text-gray-500',
} as const;

// 确认按钮样式映射
const confirmButtonVariantMap = {
  info: 'default',
  success: 'default',
  error: 'destructive',
  warning: 'default',
  confirm: 'default',
} as const;

// Mac OS 风格的对话框内容组件
const MessageDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Portal>
    <AlertDialogPrimitive.Overlay className='data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50' />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-xl border border-neutral-200 bg-white/95 shadow-2xl backdrop-blur-md duration-200 dark:border-neutral-700 dark:bg-neutral-900/95',
        className,
      )}
      {...props}
    />
  </AlertDialogPrimitive.Portal>
));
MessageDialogContent.displayName = 'MessageDialogContent';

// JSX 组件形式的对话框
export function MessageDialog({
  type,
  title,
  description,
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  onCancel,
  showCancel = type === 'confirm',
  open,
  onOpenChange,
}: MessageDialogProps) {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const IconComponent = iconMap[type];
  const iconColor = iconColorMap[type];
  const confirmVariant = confirmButtonVariantMap[type];

  const handleConfirm = async () => {
    if (onConfirm) {
      setConfirmLoading(true);
      try {
        await onConfirm();
      } finally {
        setConfirmLoading(false);
      }
    }
    onOpenChange?.(false);
  };

  const handleCancel = async () => {
    if (onCancel) {
      setCancelLoading(true);
      try {
        await onCancel();
      } finally {
        setCancelLoading(false);
      }
    }
    onOpenChange?.(false);
  };

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <MessageDialogContent>
        <div className='flex items-start gap-4 p-6'>
          {/* 图标 */}
          <div className='flex-shrink-0'>
            <IconComponent className={cn('h-6 w-6', iconColor)} />
          </div>

          {/* 内容 */}
          <div className='flex-1 space-y-3'>
            {/* 标题 */}
            <AlertDialogPrimitive.Title className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
              {title}
            </AlertDialogPrimitive.Title>

            {/* 描述 */}
            {description && (
              <AlertDialogPrimitive.Description className='text-sm leading-relaxed text-neutral-600 dark:text-neutral-400'>
                {description}
              </AlertDialogPrimitive.Description>
            )}

            {/* 按钮 */}
            <div className='flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end'>
              {showCancel && (
                <AlertDialogPrimitive.Cancel asChild>
                  <button
                    className={cn(buttonVariants({ variant: 'outline' }), 'min-w-[80px]')}
                    onClick={handleCancel}
                    disabled={confirmLoading || cancelLoading}
                  >
                    {cancelLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                    {cancelText}
                  </button>
                </AlertDialogPrimitive.Cancel>
              )}

              <AlertDialogPrimitive.Action asChild>
                <button
                  className={cn(buttonVariants({ variant: confirmVariant as any }), 'min-w-[80px]')}
                  onClick={handleConfirm}
                  disabled={confirmLoading || cancelLoading}
                >
                  {confirmLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                  {confirmText}
                </button>
              </AlertDialogPrimitive.Action>
            </div>
          </div>
        </div>
      </MessageDialogContent>
    </AlertDialogPrimitive.Root>
  );
}

// 全局状态管理
interface DialogInstance {
  id: string;
  root: ReactDOM.Root;
  container: HTMLElement;
  resolve: (value: boolean) => void;
}

const dialogInstances = new Map<string, DialogInstance>();

// 清理对话框实例
function cleanupDialog(id: string) {
  const instance = dialogInstances.get(id);
  if (instance) {
    instance.root.unmount();
    document.body.removeChild(instance.container);
    dialogInstances.delete(id);
  }
}

// 创建对话框实例
function createDialog(config: MessageConfig): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const id = Math.random().toString(36).substring(7);
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    // 存储实例信息
    dialogInstances.set(id, {
      id,
      root,
      container,
      resolve,
    });

    const DialogComponent = () => {
      const [open, setOpen] = useState(true);
      const [confirmLoading, setConfirmLoading] = useState(false);
      const [cancelLoading, setCancelLoading] = useState(false);

      const IconComponent = iconMap[config.type];
      const iconColor = iconColorMap[config.type];
      const confirmVariant = confirmButtonVariantMap[config.type];
      const showCancel = config.showCancel ?? config.type === 'confirm';

      const handleConfirm = async () => {
        if (config.onConfirm) {
          setConfirmLoading(true);
          try {
            await config.onConfirm();
          } finally {
            setConfirmLoading(false);
          }
        }
        resolve(true);
        setOpen(false);
        setTimeout(() => cleanupDialog(id), 200);
      };

      const handleCancel = async () => {
        if (config.onCancel) {
          setCancelLoading(true);
          try {
            await config.onCancel();
          } finally {
            setCancelLoading(false);
          }
        }
        resolve(false);
        setOpen(false);
        setTimeout(() => cleanupDialog(id), 200);
      };

      const handleOpenChange = (open: boolean) => {
        if (!open) {
          resolve(false);
          setOpen(false);
          setTimeout(() => cleanupDialog(id), 200);
        }
      };

      return (
        <AlertDialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
          <MessageDialogContent>
            <div className='flex items-start gap-4 p-6'>
              {/* 图标 */}
              <div className='flex-shrink-0'>
                <IconComponent className={cn('h-6 w-6', iconColor)} />
              </div>

              {/* 内容 */}
              <div className='flex-1 space-y-3'>
                {/* 标题 */}
                <AlertDialogPrimitive.Title className='text-lg font-semibold text-neutral-900 dark:text-neutral-100'>
                  {config.title}
                </AlertDialogPrimitive.Title>

                {/* 描述 */}
                {config.description && (
                  <AlertDialogPrimitive.Description className='text-sm leading-relaxed text-neutral-600 dark:text-neutral-400'>
                    {config.description}
                  </AlertDialogPrimitive.Description>
                )}

                {/* 按钮 */}
                <div className='flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end'>
                  {showCancel && (
                    <AlertDialogPrimitive.Cancel asChild>
                      <button
                        className={cn(buttonVariants({ variant: 'outline' }), 'min-w-[80px]')}
                        onClick={handleCancel}
                        disabled={confirmLoading || cancelLoading}
                      >
                        {cancelLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                        {config.cancelText || '取消'}
                      </button>
                    </AlertDialogPrimitive.Cancel>
                  )}

                  <AlertDialogPrimitive.Action asChild>
                    <button
                      className={cn(
                        buttonVariants({ variant: confirmVariant as any }),
                        'min-w-[80px]',
                      )}
                      onClick={handleConfirm}
                      disabled={confirmLoading || cancelLoading}
                    >
                      {confirmLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                      {config.confirmText || '确定'}
                    </button>
                  </AlertDialogPrimitive.Action>
                </div>
              </div>
            </div>
          </MessageDialogContent>
        </AlertDialogPrimitive.Root>
      );
    };

    root.render(<DialogComponent />);
  });
}

// API 方法
export const message = {
  info: (config: Omit<MessageConfig, 'type'>): Promise<boolean> => {
    return createDialog({ ...config, type: 'info' });
  },

  success: (config: Omit<MessageConfig, 'type'>): Promise<boolean> => {
    return createDialog({ ...config, type: 'success' });
  },

  error: (config: Omit<MessageConfig, 'type'>): Promise<boolean> => {
    return createDialog({ ...config, type: 'error' });
  },

  warning: (config: Omit<MessageConfig, 'type'>): Promise<boolean> => {
    return createDialog({ ...config, type: 'warning' });
  },

  confirm: (config: Omit<MessageConfig, 'type'>): Promise<boolean> => {
    return createDialog({ ...config, type: 'confirm' });
  },

  destroyAll: (): void => {
    dialogInstances.forEach((_, id) => {
      cleanupDialog(id);
    });
  },
};

// 默认导出
export default message;
