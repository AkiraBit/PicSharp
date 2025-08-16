import { memo, useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import useAppStore from '@/store/app';
import { cn } from '@/lib/utils';

export interface ImageViewerProps {
  src?: string;
  path: string;
  ext?: string;
  className?: string;
  imgClassName?: string;
  canvasClassName?: string;
  lazy?: boolean;
  rootMargin?: string;
}

export interface ImageViewerRef {
  getSize: () => { width: number; height: number } | null;
}

const canvasRenderTypes = ['tif', 'tiff', 'heic', 'heif', 'jxl'];

const ImageViewer = forwardRef<ImageViewerRef, ImageViewerProps>(function ImageViewer(
  props: ImageViewerProps,
  ref,
) {
  const {
    src,
    path,
    ext,
    className,
    imgClassName,
    canvasClassName,
    lazy = true,
    rootMargin = '100px',
  } = props;
  const isCanvasRender = canvasRenderTypes.includes((ext || '').toLowerCase());

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const sidecarOrigin = useAppStore((s) => s.sidecar?.origin);
  const [isInView, setIsInView] = useState<boolean>(!lazy);
  const hasRenderedRef = useRef<boolean>(false);

  useImperativeHandle(
    ref,
    () => ({
      getSize: () => {
        if (isCanvasRender) {
          const el = canvasRef.current;
          return el ? { width: el.width, height: el.height } : null;
        }
        const el = imgRef.current;
        if (!el) return null;
        const width = el.naturalWidth || el.width;
        const height = el.naturalHeight || el.height;
        return width && height ? { width, height } : null;
      },
    }),
    [isCanvasRender],
  );

  useEffect(() => {
    if (!lazy) {
      setIsInView(true);
      return;
    }
    const targetEl = isCanvasRender ? canvasRef.current : imgRef.current;
    if (!targetEl) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { root: null, rootMargin, threshold: 0.1 },
    );
    observer.observe(targetEl);
    return () => observer.disconnect();
  }, [lazy, isCanvasRender, rootMargin]);

  useEffect(() => {
    let aborted = false;
    if (!isCanvasRender) {
      return;
    }
    if (!sidecarOrigin) {
      setErrorMessage('Sidecar not ready');
      return;
    }
    if (!isInView) {
      return;
    }
    if (hasRenderedRef.current) {
      return;
    }
    const run = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await fetch(`${sidecarOrigin}/api/codec/get-raw-pixels`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input_path: path }),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const json: { width: number; height: number; data: number[] } = await response.json();
        if (aborted) return;

        const width: number = json.width;
        const height: number = json.height;
        let pixelSource: number[] | Uint8Array = [];
        if (Array.isArray(json.data)) {
          pixelSource = json.data as number[];
        } else if (typeof json.data === 'string') {
          const binary = atob(json.data);
          const arr = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
          pixelSource = arr;
        }

        const totalPixels = width * height;
        const input = pixelSource instanceof Uint8Array ? pixelSource : new Uint8Array(pixelSource);
        const channels = Math.max(1, Math.floor(input.length / Math.max(1, totalPixels)));

        // Normalize to RGBA
        let rgba: Uint8ClampedArray;
        if (channels === 4) {
          rgba = new Uint8ClampedArray(input.buffer.slice(0));
        } else if (channels === 3) {
          rgba = new Uint8ClampedArray(totalPixels * 4);
          for (let i = 0, j = 0; i < input.length; i += 3, j += 4) {
            rgba[j] = input[i];
            rgba[j + 1] = input[i + 1];
            rgba[j + 2] = input[i + 2];
            rgba[j + 3] = 255;
          }
        } else if (channels === 1) {
          rgba = new Uint8ClampedArray(totalPixels * 4);
          for (let i = 0, j = 0; i < input.length; i += 1, j += 4) {
            const v = input[i];
            rgba[j] = v;
            rgba[j + 1] = v;
            rgba[j + 2] = v;
            rgba[j + 3] = 255;
          }
        } else {
          // Fallback: try first 3 as RGB
          rgba = new Uint8ClampedArray(totalPixels * 4);
          for (let p = 0; p < totalPixels; p++) {
            const base = p * channels;
            rgba[p * 4] = input[base] || 0;
            rgba[p * 4 + 1] = input[base + 1] || 0;
            rgba[p * 4 + 2] = input[base + 2] || 0;
            rgba[p * 4 + 3] = 255;
          }
        }

        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx || !canvasRef.current) {
          throw new Error('Canvas not ready');
        }
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        const imageData = new ImageData(rgba, width, height);
        ctx.putImageData(imageData, 0, 0);
        hasRenderedRef.current = true;
      } catch (err) {
        if (!aborted) setErrorMessage(err.message || String(err));
      } finally {
        if (!aborted) setIsLoading(false);
      }
    };
    run();
    return () => {
      aborted = true;
    };
  }, [isCanvasRender, path, sidecarOrigin, isInView]);

  if (!isCanvasRender) {
    return (
      <div className={cn('relative flex items-center justify-center', className)}>
        {!isInView && (
          <div className='absolute inset-0 flex items-center justify-center text-xs text-neutral-500'>
            Loading...
          </div>
        )}
        <img
          ref={imgRef}
          src={isInView ? src || convertFileSrc(path) : undefined}
          alt={path}
          className={cn('max-h-full max-w-full object-contain', imgClassName)}
          loading='lazy'
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div className={cn('relative contain-layout', className)}>
      <canvas ref={canvasRef} className={cn('max-h-full max-w-full', canvasClassName)} />
      {isLoading && (
        <div className='absolute inset-0 flex items-center justify-center text-xs text-neutral-500'>
          Loading...
        </div>
      )}
      {errorMessage && (
        <div className='absolute inset-0 flex items-center justify-center text-xs text-red-500'>
          {errorMessage}
        </div>
      )}
    </div>
  );
});

export default memo(ImageViewer);
