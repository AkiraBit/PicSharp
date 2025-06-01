# Message 对话框组件

基于 shadcn ui 的 alert-dialog 组件，实现的 Mac OS 风格系统对话框组件。

## 特性

- 🎨 **Mac OS 风格设计** - 采用毛玻璃效果和圆角设计
- 🚀 **双重使用方式** - 支持 JSX 组件和 API 调用两种使用方式
- 🎯 **5种对话框类型** - Info、Success、Error、Warning、Confirm
- ⚡ **异步回调支持** - 按钮支持异步操作，自动处理 loading 状态
- 🔧 **Promise 接口** - API 调用返回 Promise<boolean>，便于处理用户选择
- 🗂️ **全局管理** - 提供 destroyAll 方法统一销毁所有对话框

## 安装依赖

```bash
# 确保已安装以下依赖
npm install @radix-ui/react-alert-dialog lucide-react class-variance-authority clsx tailwind-merge
```

## 基础使用

### API 调用方式

```tsx
import message from '@/components/message';

// 信息提示
const result = await message.info({
  title: '信息提示',
  description: '这是一个信息提示',
  confirmText: '我知道了',
});

// 成功提示
const result = await message.success({
  title: '操作成功',
  description: '您的操作已成功完成！',
  confirmText: '好的',
});

// 错误提示
const result = await message.error({
  title: '操作失败',
  description: '抱歉，操作失败，请稍后重试。',
  confirmText: '重试',
});

// 警告提示
const result = await message.warning({
  title: '警告',
  description: '此操作可能会影响系统性能，请谨慎操作。',
  confirmText: '继续',
});

// 确认对话框
const result = await message.confirm({
  title: '确认删除',
  description: '您确定要删除这个项目吗？此操作不可撤销。',
  confirmText: '删除',
  cancelText: '取消',
});

console.log('用户选择:', result); // true: 确认, false: 取消或关闭
```

### JSX 组件方式

```tsx
import { MessageDialog } from '@/components/message';
import { useState } from 'react';

function MyComponent() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}>打开对话框</button>

      <MessageDialog
        type='confirm'
        title='确认删除'
        description='此操作不可撤销，确定要继续吗？'
        confirmText='删除'
        cancelText='取消'
        open={open}
        onOpenChange={setOpen}
        onConfirm={async () => {
          await deleteItem();
        }}
        onCancel={async () => {
          await cancelOperation();
        }}
      />
    </>
  );
}
```

## 异步回调处理

组件支持异步回调函数，会自动处理 loading 状态：

```tsx
const result = await message.confirm({
  title: '保存文件',
  description: '确定要保存当前文件吗？',
  onConfirm: async () => {
    // 异步保存操作，按钮会显示 loading 状态
    await saveFile();
    console.log('文件保存完成');
  },
  onCancel: async () => {
    // 异步取消操作
    await cancelSave();
    console.log('取消保存');
  },
});
```

## API 参考

### MessageConfig 接口

```tsx
interface MessageConfig {
  type: 'info' | 'success' | 'error' | 'warning' | 'confirm';
  title: string; // 对话框标题
  description?: string | React.ReactNode; // 对话框描述内容
  confirmText?: string; // 确认按钮文字，默认"确定"
  cancelText?: string; // 取消按钮文字，默认"取消"
  onConfirm?: () => void | Promise<void>; // 确认按钮回调
  onCancel?: () => void | Promise<void>; // 取消按钮回调
  showCancel?: boolean; // 是否显示取消按钮，confirm类型默认true
}
```

### MessageDialogProps 接口

```tsx
interface MessageDialogProps extends MessageConfig {
  open: boolean; // 对话框开启状态
  onOpenChange?: (open: boolean) => void; // 开启状态变化回调
}
```

### API 方法

```tsx
const message = {
  // 信息提示
  info: (config: Omit<MessageConfig, 'type'>) => Promise<boolean>;

  // 成功提示
  success: (config: Omit<MessageConfig, 'type'>) => Promise<boolean>;

  // 错误提示
  error: (config: Omit<MessageConfig, 'type'>) => Promise<boolean>;

  // 警告提示
  warning: (config: Omit<MessageConfig, 'type'>) => Promise<boolean>;

  // 确认对话框
  confirm: (config: Omit<MessageConfig, 'type'>) => Promise<boolean>;

  // 销毁所有对话框
  destroyAll: () => void;
};
```

## 对话框类型说明

| 类型    | 图标 | 确认按钮样式 | 默认显示取消按钮 | 使用场景 |
| ------- | ---- | ------------ | ---------------- | -------- |
| info    | ℹ️   | 默认蓝色     | 否               | 信息展示 |
| success | ✅   | 默认蓝色     | 否               | 成功反馈 |
| error   | ❌   | 红色危险     | 否               | 错误提示 |
| warning | ⚠️   | 默认蓝色     | 否               | 警告提示 |
| confirm | ❓   | 默认蓝色     | 是               | 确认操作 |

## 样式定制

组件采用 Tailwind CSS 实现，支持深色模式。主要样式特性：

- **毛玻璃效果**: `bg-white/95 backdrop-blur-md`
- **圆角设计**: `rounded-xl`
- **阴影效果**: `shadow-2xl`
- **响应式布局**: 移动端垂直排列，桌面端水平排列
- **动画效果**: 淡入淡出和缩放动画

## 最佳实践

1. **确认删除操作**：使用 `confirm` 类型，设置红色确认按钮
2. **异步操作反馈**：利用异步回调处理长时间操作
3. **批量操作管理**：使用 `destroyAll()` 清理所有对话框
4. **错误处理**：在 `onConfirm` 和 `onCancel` 中添加错误处理

```tsx
// 删除确认对话框示例
const result = await message.confirm({
  title: '确认删除',
  description: '此操作将永久删除选中的项目，无法恢复。',
  confirmText: '删除',
  cancelText: '取消',
  onConfirm: async () => {
    try {
      await deleteItems();
      message.success({
        title: '删除成功',
        description: '选中的项目已被删除',
      });
    } catch (error) {
      message.error({
        title: '删除失败',
        description: '删除过程中发生错误，请稍后重试',
      });
    }
  },
});
```

## 注意事项

- 组件依赖 `@radix-ui/react-alert-dialog`，确保正确安装
- API 调用会在 document.body 中动态创建 DOM 节点
- 异步回调函数中的错误需要手动处理
- 建议在应用卸载时调用 `destroyAll()` 清理资源
