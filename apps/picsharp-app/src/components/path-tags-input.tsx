import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Maximize2 } from 'lucide-react';

export interface PathTagsInputProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  title?: string;
  value?: string[];
  onChange?: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  /**
   * 是否对 onChange 做动画帧节流，减少快速删除时的外部重渲染压力（默认 true）
   */
  optimizeOnChange?: boolean;
  inputAriaLabel?: string;
}

interface EditableTagProps {
  index: number;
  text: string;
  isEditing: boolean;
  disabled?: boolean;
  onRequestEdit: (index: number) => void;
  onConfirmEdit: (index: number, next: string) => void;
  onCancelEdit: () => void;
  onRemove: (index: number) => void;
}

const EditableTag = React.memo(function EditableTag({
  index,
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
          onBlur={() => onConfirmEdit(index, editingValue.trim())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onConfirmEdit(index, editingValue.trim());
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
          onClick={() => onRemove(index)}
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
          variant='midnight'
          className={cn(
            'group inline-flex max-w-[300px] cursor-text items-center gap-1',
            disabled && 'cursor-not-allowed opacity-60',
          )}
          onClick={() => {
            if (!disabled) {
              onRequestEdit(index);
            }
          }}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'Enter') {
              e.preventDefault();
              onRequestEdit(index);
            }
            if (e.key === 'Backspace' || e.key === 'Delete') {
              e.preventDefault();
              onRemove(index);
            }
          }}
          role='button'
          tabIndex={0}
        >
          <span className='truncate'>{text}</span>
          {!disabled && (
            <Button
              type='button'
              variant='ghost'
              size='icon'
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(index);
              }}
              aria-label='Remove path'
              className='h-5 w-5 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
            >
              ×
            </Button>
          )}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className='flex max-w-[300px] flex-wrap break-all'>{text}</div>
      </TooltipContent>
    </Tooltip>
  );
});

export function PathTagsInput({
  title,
  value,
  onChange,
  placeholder,
  disabled,
  className,
  optimizeOnChange = true,
  inputAriaLabel = 'Path input',
  ...divProps
}: PathTagsInputProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dialogInputRef = React.useRef<HTMLInputElement>(null);
  const [pendingText, setPendingText] = React.useState('');
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const isControlled = value !== undefined;
  const [uncontrolledTags, setUncontrolledTags] = React.useState<string[]>(() => value ?? []);
  const tags = isControlled ? (value as string[]) : uncontrolledTags;
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const scheduledNextRef = React.useRef<string[] | null>(null);
  const rafIdRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  // 当外部传入 value（受控）时，保持内部状态同步，便于在受控/非受控切换时行为稳定
  React.useEffect(() => {
    if (value !== undefined) {
      setUncontrolledTags(value);
    }
  }, [value]);

  const applyNext = React.useCallback(
    (next: string[]) => {
      if (!isControlled) {
        startTransition(() => {
          setUncontrolledTags(next);
        });
      }
      if (!optimizeOnChange) {
        onChange?.(next);
        return;
      }
      scheduledNextRef.current = next;
      if (rafIdRef.current == null) {
        rafIdRef.current = requestAnimationFrame(() => {
          if (scheduledNextRef.current) {
            onChange?.(scheduledNextRef.current);
            scheduledNextRef.current = null;
          }
          rafIdRef.current = null;
        });
      }
    },
    [isControlled, onChange, optimizeOnChange],
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

  const handleRequestEdit = React.useCallback((i: number) => setEditingIndex(i), []);
  const handleConfirmEdit = React.useCallback(
    (i: number, next: string) => {
      updateIndex(i, next);
      setEditingIndex(null);
    },
    [updateIndex],
  );
  const handleCancelEdit = React.useCallback(() => setEditingIndex(null), []);
  const handleRemove = React.useCallback((i: number) => removeIndex(i), [removeIndex]);

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
    <>
      <div
        {...divProps}
        ref={containerRef}
        className={cn(
          'group relative flex min-h-[60px] w-full flex-wrap items-start gap-2 rounded-md border border-neutral-200 bg-transparent text-base shadow-sm focus-within:ring-1 focus-within:ring-neutral-950 md:text-sm dark:border-neutral-600 dark:focus-within:ring-neutral-300',
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
              <div key={index} data-path-tag tabIndex={0} className='focus:outline-none'>
                <EditableTag
                  index={index}
                  text={text}
                  isEditing={editingIndex === index}
                  disabled={disabled}
                  onRequestEdit={handleRequestEdit}
                  onConfirmEdit={handleConfirmEdit}
                  onCancelEdit={handleCancelEdit}
                  onRemove={handleRemove}
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

        <Button
          type='button'
          variant='ghost'
          size='icon'
          aria-label='Expand paths editor'
          className='absolute bottom-1 right-1 h-6 w-6 opacity-0 transition-all duration-300 group-hover:opacity-100 dark:bg-neutral-600/70'
          onClick={(e) => {
            e.stopPropagation();
            setIsDialogOpen(true);
          }}
        >
          <Maximize2 className='h-2 w-2' />
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='w-[90vw] max-w-3xl p-4 dark:bg-neutral-900'>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className='mt-2 flex flex-col gap-2'>
            <div
              className={cn(
                'flex min-h-[240px] w-full flex-wrap items-start gap-2 rounded-md border border-neutral-200 bg-transparent text-base shadow-sm focus-within:ring-1 focus-within:ring-neutral-950 md:text-sm dark:border-neutral-700/70 dark:focus-within:ring-neutral-300',
                disabled && 'cursor-not-allowed opacity-60 focus-within:ring-0',
              )}
              onClick={() => {
                if (!disabled) {
                  dialogInputRef.current?.focus();
                }
              }}
            >
              <ScrollArea className='h-[50vh] w-full'>
                <div className='flex h-full w-full flex-wrap gap-1 p-2'>
                  {tags.map((text, index) => (
                    <div
                      key={`dialog-${index}`}
                      data-path-tag
                      tabIndex={0}
                      className='focus:outline-none'
                    >
                      <EditableTag
                        index={index}
                        text={text}
                        isEditing={editingIndex === index}
                        disabled={disabled}
                        onRequestEdit={handleRequestEdit}
                        onConfirmEdit={handleConfirmEdit}
                        onCancelEdit={handleCancelEdit}
                        onRemove={handleRemove}
                      />
                    </div>
                  ))}
                  <input
                    ref={dialogInputRef}
                    value={pendingText}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    disabled={disabled}
                    aria-label={inputAriaLabel}
                    placeholder={tags.length === 0 ? placeholder : undefined}
                    className={cn(
                      'h-0 min-w-[160px] flex-1 bg-transparent p-0 text-neutral-900 placeholder:text-neutral-500 focus:h-auto focus:p-1 focus:outline-none dark:text-neutral-100 dark:placeholder:text-neutral-400',
                    )}
                  />
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
