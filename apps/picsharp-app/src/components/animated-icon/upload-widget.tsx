import { Images } from 'lucide-react';
import { VALID_IMAGE_EXTS } from '@/constants';
import { useEffect, useMemo, useRef, useState } from 'react';

export default function UploadWidget() {
  const formats = useMemo(() => VALID_IMAGE_EXTS.map((x) => x.toUpperCase()), []);
  const [isHovered, setIsHovered] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function clearTimers() {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    if (isHovered) {
      // 每轮 1200ms：先淡出，再切换文本并淡入
      intervalRef.current = window.setInterval(() => {
        setIsFadingOut(true);
        timeoutRef.current = window.setTimeout(() => {
          setCurrentIndex((idx) => (idx + 1) % formats.length);
          setIsFadingOut(false);
        }, 240);
      }, 1500);
    } else {
      clearTimers();
      setIsFadingOut(false);
      setCurrentIndex(0);
    }

    return () => {
      clearTimers();
    };
  }, [isHovered]);

  useEffect(() => {
    if (elRef.current) {
      const handlerEnter = () => setIsHovered(true);
      const handlerLeave = () => setIsHovered(false);
      elRef.current.parentElement?.addEventListener('mouseenter', handlerEnter);
      elRef.current.parentElement?.addEventListener('mouseleave', handlerLeave);
      return () => {
        elRef.current?.parentElement?.removeEventListener('mouseenter', handlerEnter);
        elRef.current?.parentElement?.removeEventListener('mouseleave', handlerLeave);
      };
    }
  }, []);

  return (
    <div ref={elRef} className='relative'>
      {/* 图标/文本层：悬停时按压 + 文本淡入淡出循环 */}
      <div className='relative z-10 mx-auto flex h-32 w-32 -translate-y-8 translate-x-8 cursor-pointer items-center justify-center rounded-xl bg-neutral-800/90 shadow-2xl transition-all duration-500 group-hover:translate-x-[1.25rem] group-hover:translate-y-[-1.25rem]'>
        {!isHovered ? (
          <Images size={24} className='text-neutral-400/80 transition-transform duration-300' />
        ) : (
          <div className='flex items-center justify-center'>
            <div
              className={
                'relative h-6 overflow-hidden text-sky-200/90 transition-all duration-300 will-change-transform ' +
                (isFadingOut
                  ? 'translate-y-1 scale-95 opacity-0'
                  : 'translate-y-0 scale-100 opacity-100')
              }
            >
              <span className='font-mono text-base tracking-widest'>{formats[currentIndex]}</span>
            </div>
          </div>
        )}
      </div>

      {/* 虚线边框层：悬停时淡蓝霓虹灯效果 */}
      <div className='absolute inset-0 mx-auto flex h-32 w-32 items-center justify-center rounded-xl border border-dashed border-neutral-100 bg-transparent opacity-80 transition-all duration-300 group-hover:border-sky-300 group-hover:bg-sky-400/5 group-hover:opacity-90 group-hover:shadow-[0_0_16px_rgba(56,189,248,0.55),0_0_32px_rgba(56,189,248,0.35)]'></div>
    </div>
  );
}
