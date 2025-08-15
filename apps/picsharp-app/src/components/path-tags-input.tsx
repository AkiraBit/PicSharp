import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

export interface PathTagsInputProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  /**
   * 自定义输入框的 aria-label，便于无障碍
   */
  inputAriaLabel?: string;
}

interface EditableTagProps {
  text: string;
  isEditing: boolean;
  disabled?: boolean;
  onRequestEdit: () => void;
  onConfirmEdit: (next: string) => void;
  onCancelEdit: () => void;
  onRemove: () => void;
}

function EditableTag({
  text,
  isEditing,
  disabled,
  onRequestEdit,
  onConfirmEdit,
  onCancelEdit,
  onRemove,
}: EditableTagProps) {
  const [editingValue, setEditingValue] = React.useState(text);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setEditingValue(text);
  }, [text]);

  React.useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className='inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900'>
        <input
          ref={inputRef}
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onBlur={() => onConfirmEdit(editingValue.trim())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onConfirmEdit(editingValue.trim());
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              onCancelEdit();
            }
          }}
          disabled={disabled}
          className={cn(
            'min-w-[2ch] bg-transparent text-neutral-900 outline-none dark:text-neutral-100',
          )}
        />
        <Button
          type='button'
          variant='ghost'
          size='icon'
          disabled={disabled}
          onClick={() => onRemove()}
          aria-label='Remove path'
          className='h-6 w-6 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
        >
          ×
        </Button>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger>
        <Badge
          variant='minor'
          className={cn(
            'group inline-flex max-w-[300px] cursor-text items-center gap-1',
            disabled && 'cursor-not-allowed opacity-60',
          )}
          onClick={() => {
            if (!disabled) {
              onRequestEdit();
            }
          }}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'Enter') {
              e.preventDefault();
              onRequestEdit();
            }
            if (e.key === 'Backspace' || e.key === 'Delete') {
              e.preventDefault();
              onRemove();
            }
          }}
          role='button'
          tabIndex={0}
        >
          <span className='truncate'>{text}</span>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            aria-label='Remove path'
            className='h-5 w-5 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
          >
            ×
          </Button>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className='flex max-w-[300px] flex-wrap break-all'>{text}</div>
      </TooltipContent>
    </Tooltip>
  );
}

export function PathTagsInput({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  inputAriaLabel = 'Path input',
  ...divProps
}: PathTagsInputProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [pendingText, setPendingText] = React.useState('');
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const isControlled = value !== undefined;
  const [uncontrolledTags, setUncontrolledTags] = React.useState<string[]>(() => value ?? []);
  const tags = isControlled ? (value as string[]) : uncontrolledTags;

  // 当外部传入 value（受控）时，保持内部状态同步，便于在受控/非受控切换时行为稳定
  React.useEffect(() => {
    if (value !== undefined) {
      setUncontrolledTags(value);
    }
  }, [value]);

  const applyNext = React.useCallback(
    (next: string[]) => {
      if (!isControlled) {
        setUncontrolledTags(next);
      }
      onChange(next);
    },
    [isControlled, onChange],
  );

  const commitTokens = React.useCallback(
    (tokens: string[]) => {
      if (tokens.length === 0) return;
      const normalized = tokens.map((s) => s.trim()).filter((s) => s.length > 0);
      if (normalized.length === 0) return;
      applyNext([...tags, ...normalized]);
    },
    [applyNext, tags],
  );

  const commitPendingAsToken = React.useCallback(() => {
    const token = pendingText.trim();
    if (token.length === 0) return;
    applyNext([...tags, token]);
    setPendingText('');
  }, [pendingText, applyNext, tags]);

  const removeIndex = React.useCallback(
    (index: number) => {
      const next = tags.filter((_, i) => i !== index);
      applyNext(next);
      if (editingIndex != null && editingIndex >= next.length) {
        setEditingIndex(null);
      }
    },
    [applyNext, tags, editingIndex],
  );

  const updateIndex = React.useCallback(
    (index: number, nextText: string) => {
      const trimmed = nextText.trim();
      const next = tags.map((v, i) => (i === index ? trimmed : v));
      applyNext(next);
    },
    [applyNext, tags],
  );

  const handlePaste: React.ClipboardEventHandler<HTMLInputElement> = React.useCallback(
    (e) => {
      if (disabled) return;
      const text = e.clipboardData.getData('text');
      if (!text) return;
      if (text.includes('\n')) {
        e.preventDefault();
        const parts = text.split(/\r?\n/);
        // 若末尾有残留，放到 pending
        const tokens = parts.map((s) => s.trim()).filter(Boolean);
        commitTokens(tokens);
        setPendingText('');
      }
    },
    [disabled, commitTokens],
  );

  const handleInputChange: React.ChangeEventHandler<HTMLInputElement> = React.useCallback(
    (e) => {
      if (disabled) return;
      const next = e.target.value;
      if (next.includes('\n')) {
        const parts = next.split(/\r?\n/);
        const head = parts.slice(0, -1);
        const tail = parts[parts.length - 1] ?? '';
        commitTokens(head);
        setPendingText(tail);
      } else {
        setPendingText(next);
      }
    },
    [disabled, commitTokens],
  );

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = React.useCallback(
    (e) => {
      if (disabled) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        commitPendingAsToken();
      }
      if ((e.key === 'Backspace' || e.key === 'Delete') && pendingText.length === 0) {
        if (tags.length > 0) {
          e.preventDefault();
          removeIndex(tags.length - 1);
        }
      }
      if (e.key === 'ArrowLeft' && pendingText.length === 0) {
        // 将焦点移到最后一个 tag，便于可达性
        const lastTag = containerRef.current?.querySelector<HTMLDivElement>(
          '[data-path-tag]:last-of-type',
        );
        lastTag?.focus();
      }
    },
    [disabled, pendingText, tags.length, commitPendingAsToken, removeIndex],
  );

  return (
    <div
      {...divProps}
      ref={containerRef}
      className={cn(
        'flex min-h-[60px] w-full flex-wrap items-start gap-2 rounded-md border border-neutral-200 bg-transparent text-base shadow-sm focus-within:ring-1 focus-within:ring-neutral-950 md:text-sm dark:border-neutral-600 dark:focus-within:ring-neutral-300',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
      onClick={() => {
        if (!disabled) {
          inputRef.current?.focus();
        }
      }}
    >
      <ScrollArea className='h-full w-full'>
        <div className='flex h-full w-full flex-wrap gap-1 p-2'>
          {tags.map((text, index) => (
            <div key={`${index}-${text}`} data-path-tag tabIndex={0} className='focus:outline-none'>
              <EditableTag
                text={text}
                isEditing={editingIndex === index}
                disabled={disabled}
                onRequestEdit={() => setEditingIndex(index)}
                onConfirmEdit={(next) => {
                  updateIndex(index, next);
                  setEditingIndex(null);
                }}
                onCancelEdit={() => setEditingIndex(null)}
                onRemove={() => removeIndex(index)}
              />
            </div>
          ))}
          <input
            ref={inputRef}
            value={pendingText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={disabled}
            aria-label={inputAriaLabel}
            placeholder={tags.length === 0 ? placeholder : undefined}
            className={cn(
              'h-0 min-w-[120px] flex-1 bg-transparent p-0 text-neutral-900 placeholder:text-neutral-500 focus:h-auto focus:p-1 focus:outline-none dark:text-neutral-100 dark:placeholder:text-neutral-400',
            )}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
