import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import message, { MessageDialog, MessageType } from '@/components/message';

export default function MessageDemo() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<MessageType>('info');

  // API 调用示例
  const handleApiCall = async (type: MessageType) => {
    let result: boolean;

    switch (type) {
      case 'info':
        result = await message.info({
          title: '信息提示',
          description: '这是一个信息提示对话框',
          confirmText: '我知道了',
        });
        break;

      case 'success':
        result = await message.success({
          title: '操作成功',
          description: '您的操作已成功完成！',
          confirmText: '好的',
        });
        break;

      case 'error':
        result = await message.error({
          title: '操作失败',
          description: '抱歉，操作失败，请稍后重试。',
          confirmText: '重试',
        });
        break;

      case 'warning':
        result = await message.warning({
          title: '警告',
          description: '此操作可能会影响系统性能，请谨慎操作。',
          confirmText: '继续',
        });
        break;

      case 'confirm':
        result = await message.confirm({
          title: '确认删除',
          description: '您确定要删除这个项目吗？此操作不可撤销。',
          confirmText: '删除',
          cancelText: '取消',
        });
        break;

      default:
        return;
    }

    console.log(`对话框结果: ${result}`);
  };

  // 异步回调示例
  const handleAsyncCallback = async (type: MessageType) => {
    const result = await message[type]({
      title: '异步操作测试',
      description: '点击确认按钮会模拟2秒的异步操作',
      confirmText: '执行异步操作',
      cancelText: '取消',
      onConfirm: async () => {
        // 模拟异步操作
        await new Promise((resolve) => setTimeout(resolve, 2000));
        console.log('异步操作完成');
      },
      onCancel: async () => {
        // 模拟异步取消操作
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log('取消操作完成');
      },
    });

    console.log(`异步对话框结果: ${result}`);
  };

  // JSX 组件使用示例
  const handleJsxDialog = (type: MessageType) => {
    setDialogType(type);
    setDialogOpen(true);
  };

  const handleDialogConfirm = async () => {
    // 模拟异步操作
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log('JSX 对话框确认操作完成');
  };

  const handleDialogCancel = async () => {
    // 模拟异步操作
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log('JSX 对话框取消操作完成');
  };

  return (
    <div className='mx-auto max-w-4xl space-y-8 p-8'>
      <div>
        <h1 className='mb-4 text-3xl font-bold'>Message 对话框组件示例</h1>
        <p className='mb-8 text-gray-600'>
          展示基于 shadcn ui 的 Mac OS 风格系统对话框组件的各种使用方式
        </p>
      </div>

      {/* API 调用示例 */}
      <section>
        <h2 className='mb-4 text-2xl font-semibold'>API 调用方式</h2>
        <div className='grid grid-cols-2 gap-4 md:grid-cols-5'>
          <Button
            variant='outline'
            onClick={() => handleApiCall('info')}
            className='flex h-20 flex-col gap-2'
          >
            <span className='text-blue-500'>ℹ️</span>
            <span>Info</span>
          </Button>

          <Button
            variant='outline'
            onClick={() => handleApiCall('success')}
            className='flex h-20 flex-col gap-2'
          >
            <span className='text-green-500'>✅</span>
            <span>Success</span>
          </Button>

          <Button
            variant='outline'
            onClick={() => handleApiCall('error')}
            className='flex h-20 flex-col gap-2'
          >
            <span className='text-red-500'>❌</span>
            <span>Error</span>
          </Button>

          <Button
            variant='outline'
            onClick={() => handleApiCall('warning')}
            className='flex h-20 flex-col gap-2'
          >
            <span className='text-yellow-500'>⚠️</span>
            <span>Warning</span>
          </Button>

          <Button
            variant='outline'
            onClick={() => handleApiCall('confirm')}
            className='flex h-20 flex-col gap-2'
          >
            <span className='text-gray-500'>❓</span>
            <span>Confirm</span>
          </Button>
        </div>
      </section>

      {/* 异步回调示例 */}
      <section>
        <h2 className='mb-4 text-2xl font-semibold'>异步回调示例</h2>
        <div className='grid grid-cols-2 gap-4 md:grid-cols-5'>
          <Button onClick={() => handleAsyncCallback('info')} className='flex h-16 flex-col gap-1'>
            <span>Info</span>
            <span className='text-xs'>异步回调</span>
          </Button>

          <Button
            onClick={() => handleAsyncCallback('success')}
            className='flex h-16 flex-col gap-1'
          >
            <span>Success</span>
            <span className='text-xs'>异步回调</span>
          </Button>

          <Button onClick={() => handleAsyncCallback('error')} className='flex h-16 flex-col gap-1'>
            <span>Error</span>
            <span className='text-xs'>异步回调</span>
          </Button>

          <Button
            onClick={() => handleAsyncCallback('warning')}
            className='flex h-16 flex-col gap-1'
          >
            <span>Warning</span>
            <span className='text-xs'>异步回调</span>
          </Button>

          <Button
            onClick={() => handleAsyncCallback('confirm')}
            className='flex h-16 flex-col gap-1'
          >
            <span>Confirm</span>
            <span className='text-xs'>异步回调</span>
          </Button>
        </div>
      </section>

      {/* JSX 组件使用示例 */}
      <section>
        <h2 className='mb-4 text-2xl font-semibold'>JSX 组件使用方式</h2>
        <div className='grid grid-cols-2 gap-4 md:grid-cols-5'>
          <Button
            variant='secondary'
            onClick={() => handleJsxDialog('info')}
            className='flex h-16 flex-col gap-1'
          >
            <span>Info</span>
            <span className='text-xs'>JSX 组件</span>
          </Button>

          <Button
            variant='secondary'
            onClick={() => handleJsxDialog('success')}
            className='flex h-16 flex-col gap-1'
          >
            <span>Success</span>
            <span className='text-xs'>JSX 组件</span>
          </Button>

          <Button
            variant='secondary'
            onClick={() => handleJsxDialog('error')}
            className='flex h-16 flex-col gap-1'
          >
            <span>Error</span>
            <span className='text-xs'>JSX 组件</span>
          </Button>

          <Button
            variant='secondary'
            onClick={() => handleJsxDialog('warning')}
            className='flex h-16 flex-col gap-1'
          >
            <span>Warning</span>
            <span className='text-xs'>JSX 组件</span>
          </Button>

          <Button
            variant='secondary'
            onClick={() => handleJsxDialog('confirm')}
            className='flex h-16 flex-col gap-1'
          >
            <span>Confirm</span>
            <span className='text-xs'>JSX 组件</span>
          </Button>
        </div>
      </section>

      {/* 工具方法 */}
      <section>
        <h2 className='mb-4 text-2xl font-semibold'>工具方法</h2>
        <Button variant='destructive' onClick={() => message.destroyAll()} className='h-12'>
          销毁所有对话框 (destroyAll)
        </Button>
      </section>

      {/* JSX 对话框组件 */}
      <MessageDialog
        type={dialogType}
        title={`JSX ${dialogType.toUpperCase()} 对话框`}
        description={`这是通过 JSX 组件方式使用的 ${dialogType} 对话框，支持异步回调操作。`}
        confirmText='确认操作'
        cancelText='取消操作'
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={handleDialogConfirm}
        onCancel={handleDialogCancel}
      />

      {/* 代码示例 */}
      <section>
        <h2 className='mb-4 text-2xl font-semibold'>使用示例代码</h2>
        <div className='space-y-4'>
          <div>
            <h3 className='mb-2 text-lg font-medium'>API 调用方式</h3>
            <pre className='overflow-x-auto rounded-lg bg-gray-100 p-4 text-sm dark:bg-gray-800'>
              {`// 基础调用
const result = await message.info({
  title: '信息提示',
  description: '这是一个信息提示',
  confirmText: '确定'
});

// 带异步回调
const result = await message.confirm({
  title: '确认操作',
  description: '确定要执行此操作吗？',
  onConfirm: async () => {
    await someAsyncOperation();
  },
  onCancel: async () => {
    await cancelOperation();
  }
});`}
            </pre>
          </div>

          <div>
            <h3 className='mb-2 text-lg font-medium'>JSX 组件方式</h3>
            <pre className='overflow-x-auto rounded-lg bg-gray-100 p-4 text-sm dark:bg-gray-800'>
              {`<MessageDialog
  type="confirm"
  title="确认删除"
  description="此操作不可撤销"
  open={open}
  onOpenChange={setOpen}
  onConfirm={async () => {
    await deleteItem();
  }}
/>`}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}
