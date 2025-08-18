import { useRef, createContext } from 'react';
import { Outlet } from 'react-router';
import { PageProgress, PageProgressRef } from '@/components/fullscreen-progress';

export const CompressionContext = createContext<{
  progressRef: React.RefObject<PageProgressRef>;
}>({
  progressRef: null,
});

export default function Compression() {
  const progressRef = useRef<PageProgressRef>(null);
  return (
    <CompressionContext.Provider value={{ progressRef }}>
      <div className='relative h-full overflow-auto'>
        <PageProgress ref={progressRef} />
        <Outlet />
      </div>
    </CompressionContext.Provider>
  );
}
