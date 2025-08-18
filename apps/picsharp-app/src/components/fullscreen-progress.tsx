import { forwardRef, useImperativeHandle, useRef } from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

export interface PageProgressRef {
  show: (ease?: boolean) => void;
  done: () => void;
  reset: () => void;
  setValue: (value: number) => void;
}

function easeOutCirc(x: number): number {
  return Math.sqrt(1 - Math.pow(x - 1, 2));
}

const PageProgress = forwardRef<
  PageProgressRef,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number>(null);
  const isDoneRef = useRef<boolean>(false);

  const reset = () => {
    cancelAnimationFrame(timerRef.current);
    isDoneRef.current = false;
    if (indicatorRef.current) {
      indicatorRef.current.style.transform = `translateX(-100%)`;
    }
    rootRef.current?.classList.add('hidden');
    rootRef.current?.parentElement?.style.removeProperty('position');
    rootRef.current?.parentElement?.style.removeProperty('overflow');
  };

  useImperativeHandle(ref, () => {
    return {
      show: (ease: boolean = false) => {
        if (!rootRef.current) return;
        rootRef.current?.classList.remove('hidden');
        rootRef.current.parentElement?.style.setProperty('position', 'relative');
        rootRef.current.parentElement?.style.setProperty('overflow', 'hidden');
        if (ease) {
          let progress = 0;
          const startTime = performance.now();
          const increment = (currentTime: number) => {
            if (indicatorRef.current) {
              const elapsedTime = (currentTime - startTime) / 1000; // 转换为秒
              const maxTime = 60; // 最大时间100秒
              const t = Math.min(elapsedTime / maxTime, 1); // 计算进度时间比例
              progress = easeOutCirc(t) * 100; // 使用easeOutCirc函数计算进度
              if (progress < 100 && !isDoneRef.current) {
                indicatorRef.current.style.transform = `translateX(-${100 - progress}%)`;
                timerRef.current = requestAnimationFrame(increment);
              }
            }
          };
          timerRef.current = requestAnimationFrame(increment);
        }
      },
      done: () => {
        isDoneRef.current = true;
        if (indicatorRef.current) {
          indicatorRef.current.style.transform = `translateX(0%)`;
        }
        setTimeout(reset, 500);
      },
      reset,
      setValue: (value: number) => {
        if (indicatorRef.current) {
          indicatorRef.current.style.transform = `translateX(-${100 - value}%)`;
        }
      },
    };
  });

  return (
    <div
      className='bg-background absolute left-0 top-0 z-[100] flex hidden h-full w-full items-center justify-center'
      ref={rootRef}
    >
      <div
        className={cn(
          'relative h-2 w-[50%] overflow-hidden rounded-full bg-neutral-900/20 dark:bg-neutral-50/20',
          className,
        )}
        {...props}
      >
        <div
          ref={indicatorRef}
          className='h-full w-full flex-1 bg-neutral-900 dark:bg-neutral-50'
          style={{ transform: `translateX(-100%)` }}
        />
      </div>
    </div>
  );
});

PageProgress.displayName = 'PageProgress';

export { PageProgress };
