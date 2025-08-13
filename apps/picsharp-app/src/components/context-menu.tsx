import React from 'react';
import { createRoot, Root } from 'react-dom/client';

import {
  ContextMenu as BaseContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu';

interface ImperativeContextMenuSeparator {
  type: 'separator';
}

interface ImperativeContextMenuItem {
  type: 'item';
  name: string;
  onClick?: (close: () => void) => void | Promise<void>;
  icon?: React.ReactNode;
  shortcut?: string;
  children?: ImperativeContextMenuItem[];
  disabled?: boolean;
  danger?: boolean;
}

type ImperativeContextMenuNode = ImperativeContextMenuItem | ImperativeContextMenuSeparator;

interface ContextMenuOpenOptions {
  x: number;
  y: number;
  items: ImperativeContextMenuNode[];
  onClose?: () => void;
}

type ContextMenuWithOpen = typeof BaseContextMenu & {
  open: (options: ContextMenuOpenOptions) => void;
};

function normalizeShortcutString(shortcut: string): string {
  return shortcut
    .replace(/\s+/g, '')
    .replace(/Command|Cmd|⌘/gi, 'Meta')
    .replace(/Control|Ctrl|⌃/gi, 'Ctrl')
    .replace(/Option|Alt|⌥/gi, 'Alt')
    .replace(/Shift|⇧/gi, 'Shift');
}

interface ParsedShortcut {
  meta: boolean;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  key: string;
}

function parseShortcut(shortcut?: string): ParsedShortcut | null {
  if (!shortcut) {
    return null;
  }
  const norm = normalizeShortcutString(shortcut);
  const parts = norm.split('+');
  let meta = false;
  let ctrl = false;
  let alt = false;
  let shift = false;
  let key = '';
  for (const raw of parts) {
    const token = raw.toLowerCase();
    if (token === 'meta') {
      meta = true;
      continue;
    }
    if (token === 'ctrl') {
      ctrl = true;
      continue;
    }
    if (token === 'alt') {
      alt = true;
      continue;
    }
    if (token === 'shift') {
      shift = true;
      continue;
    }
    key = token;
  }
  if (!key) {
    return null;
  }
  return { meta, ctrl, alt, shift, key };
}

function matchKey(e: KeyboardEvent, key: string): boolean {
  const k = key.toLowerCase();
  if (k.length === 1) {
    return e.key.toLowerCase() === k;
  }
  switch (k) {
    case 'enter':
      return e.key === 'Enter';
    case 'esc':
    case 'escape':
      return e.key === 'Escape';
    case 'tab':
      return e.key === 'Tab';
    case 'backspace':
      return e.key === 'Backspace';
    case 'delete':
      return e.key === 'Delete';
    case 'space':
    case 'spacebar':
      return e.key === ' ' || e.code === 'Space';
    case 'arrowup':
      return e.key === 'ArrowUp';
    case 'arrowdown':
      return e.key === 'ArrowDown';
    case 'arrowleft':
      return e.key === 'ArrowLeft';
    case 'arrowright':
      return e.key === 'ArrowRight';
    case 'home':
      return e.key === 'Home';
    case 'end':
      return e.key === 'End';
    case 'pageup':
      return e.key === 'PageUp';
    case 'pagedown':
      return e.key === 'PageDown';
    default: {
      if (/^f\d{1,2}$/.test(k)) {
        return e.key.toLowerCase() === k;
      }
      return false;
    }
  }
}

function matchShortcut(e: KeyboardEvent, parsed: ParsedShortcut): boolean {
  if (e.repeat) {
    return false;
  }
  if (!!e.metaKey !== parsed.meta) {
    return false;
  }
  if (!!e.ctrlKey !== parsed.ctrl) {
    return false;
  }
  if (!!e.altKey !== parsed.alt) {
    return false;
  }
  if (!!e.shiftKey !== parsed.shift) {
    return false;
  }
  return matchKey(e, parsed.key);
}

let imperativeContainer: HTMLDivElement | null = null;
let imperativeRoot: Root | null = null;
let imperativeInstanceKey = 0;

function ensureImperativeRoot(): void {
  if (typeof document === 'undefined') {
    return;
  }
  if (!imperativeContainer) {
    imperativeContainer = document.createElement('div');
    imperativeContainer.style.position = 'fixed';
    imperativeContainer.style.top = '0';
    imperativeContainer.style.left = '0';
    imperativeContainer.style.zIndex = '2147483647';
    document.body.appendChild(imperativeContainer);
  }
  if (!imperativeRoot) {
    imperativeRoot = createRoot(imperativeContainer);
  }
}

function ProgrammaticContextMenu({
  options,
  onRequestClose,
}: {
  options: ContextMenuOpenOptions;
  onRequestClose: () => void;
}) {
  const triggerRef = React.useRef<HTMLSpanElement | null>(null);
  const close = React.useCallback(() => {
    onRequestClose();
  }, [onRequestClose]);

  React.useEffect(() => {
    const node = triggerRef.current;
    if (!node) {
      return;
    }
    const evt = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: options.x,
      clientY: options.y,
    });
    node.dispatchEvent(evt);
  }, [options.x, options.y]);

  React.useEffect(() => {
    const shortcutItems: Array<{ parsed: ParsedShortcut; exec: () => void }> = [];
    function collect(items: ImperativeContextMenuNode[]) {
      for (const item of items) {
        if (item.type === 'separator') {
          continue;
        }
        if (item.children && item.children.length > 0) {
          collect(item.children);
        }
        const parsed = parseShortcut(item.shortcut);
        if (parsed && !item.disabled) {
          shortcutItems.push({
            parsed,
            exec: () => {
              item.onClick?.(close);
              onRequestClose();
            },
          });
        }
      }
    }
    collect(options.items);
    function onKeyDown(e: KeyboardEvent) {
      for (const { parsed, exec } of shortcutItems) {
        if (matchShortcut(e, parsed)) {
          e.preventDefault();
          e.stopPropagation();
          exec();
          return;
        }
      }
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [options.items, onRequestClose, close]);

  function renderNodes(nodes: ImperativeContextMenuNode[]): React.ReactNode {
    return nodes.map((node, idx) => {
      if (node.type === 'separator') {
        return <ContextMenuSeparator key={`sep-${idx}`} />;
      }
      const content = (
        <>
          {node.icon ? (
            <span className='mr-2 flex h-4 w-4 items-center justify-center [&>*]:h-4 [&>*]:w-4'>
              {node.icon}
            </span>
          ) : null}
          <span>{node.name}</span>
          {node.shortcut ? <ContextMenuShortcut>{node.shortcut}</ContextMenuShortcut> : null}
        </>
      );
      const className = node.danger ? 'text-red-600 dark:text-red-400' : undefined;
      if (node.children && node.children.length > 0) {
        return (
          <ContextMenuSub key={`sub-${idx}`}>
            <ContextMenuSubTrigger className={className}>{content}</ContextMenuSubTrigger>
            <ContextMenuSubContent>{renderNodes(node.children)}</ContextMenuSubContent>
          </ContextMenuSub>
        );
      }
      return (
        <ContextMenuItem
          key={`item-${idx}`}
          onSelect={() => {
            if (node.disabled) {
              return;
            }
            node.onClick?.(close);
            close();
          }}
          disabled={node.disabled}
          className={className}
        >
          {content}
        </ContextMenuItem>
      );
    });
  }

  return (
    <BaseContextMenu modal={false}>
      <ContextMenuTrigger ref={triggerRef} asChild>
        <span style={{ position: 'fixed', left: options.x, top: options.y, width: 0, height: 0 }} />
      </ContextMenuTrigger>
      <ContextMenuContent
        onCloseAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={() => onRequestClose()}
        onEscapeKeyDown={() => onRequestClose()}
      >
        {renderNodes(options.items)}
      </ContextMenuContent>
    </BaseContextMenu>
  );
}

const ContextMenu = BaseContextMenu as unknown as ContextMenuWithOpen;
ContextMenu.open = function open(options: ContextMenuOpenOptions) {
  ensureImperativeRoot();
  if (!imperativeRoot || !imperativeContainer) {
    return;
  }
  const key = ++imperativeInstanceKey;
  function handleClose() {
    if (options.onClose) {
      options.onClose();
    }
    imperativeRoot!.render(<></>);
  }
  imperativeRoot.render(
    <ProgrammaticContextMenu key={`ctx-${key}`} options={options} onRequestClose={handleClose} />,
  );
};

export { ContextMenu };
export type { ImperativeContextMenuItem, ImperativeContextMenuNode, ContextMenuOpenOptions };
