import { memo, useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import useAppStore from '@/store/app';
import { cn } from '@/lib/utils';
import { getImageViewerCacheKey, putCache, readCache, type ThumbnailCacheValue } from './cache';
import useSelector from '@/hooks/useSelector';
import { useI18n } from '@/i18n';

export interface ImageViewerProps {
  src: string;
  path: string;
  ext: string;
  size: number;
  className?: string;
  imgClassName?: string;
}

export interface ImageViewerRef {
  getImageElement: () => HTMLImageElement | null;
  getDimensions: () => { width: number; height: number } | null;
}

const noThumbnailTypes = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'svg', 'gif'];

const ImageViewer = forwardRef<ImageViewerRef, ImageViewerProps>(function ImageViewer(
  props: ImageViewerProps,
  ref,
) {
  const { src, path, ext, className, imgClassName } = props;
  const useThumbnail = !noThumbnailTypes.includes(ext);
  const t = useI18n();
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const {
    sidecar: { origin: sidecarOrigin },
    imageTempDir,
  } = useAppStore(useSelector(['sidecar', 'imageTempDir']));
  const hasRenderedRef = useRef<boolean>(false);
  const [displaySrc, setDisplaySrc] = useState<string | undefined>(
    useThumbnail ? undefined : src || convertFileSrc(path),
  );

  useImperativeHandle(ref, () => ({
    getImageElement: () => imgRef.current,
    getDimensions: () => {
      if (!imgRef.current) return null;
      const width = imgRef.current.naturalWidth || imgRef.current.width;
      const height = imgRef.current.naturalHeight || imgRef.current.height;
      return width && height ? { width, height } : null;
    },
  }));

  useEffect(() => {
    let aborted = false;
    if (!useThumbnail || !sidecarOrigin || !imageTempDir || hasRenderedRef.current) {
      return;
    }

    const run = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const outputDir = imageTempDir;
        const response = await fetch(`${sidecarOrigin}/api/image-viewer/thumbnail`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input_path: path,
            output_dir: outputDir,
            ext,
            width: 200,
            height: 150,
          }),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const json: { width: number; height: number; output_path: string } = await response.json();
        if (aborted) return;
        setDisplaySrc(convertFileSrc(json.output_path));
        const cacheKey = getImageViewerCacheKey(path, json.width, json.height);
        const record: ThumbnailCacheValue = {
          key: cacheKey,
          width: json.width,
          height: json.height,
          outputPath: json.output_path,
          updatedAt: Date.now(),
        };
        putCache(record);
        hasRenderedRef.current = true;
      } catch (err) {
        if (!aborted) setErrorMessage(t('tips.load_image_failed'));
      } finally {
        if (!aborted) setIsLoading(false);
      }
    };
    const cacheKey = getImageViewerCacheKey(path, 200, 150);
    const cached = readCache(cacheKey);
    if (cached) {
      setDisplaySrc(convertFileSrc(cached.outputPath));
      hasRenderedRef.current = true;
      setIsLoading(false);
      setErrorMessage(null);
      return () => {
        aborted = true;
      };
    }
    run();
    return () => {
      aborted = true;
    };
  }, [useThumbnail, path, sidecarOrigin, imageTempDir]);

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      {isLoading ? (
        <div className='absolute inset-0 flex items-center justify-center text-nowrap text-center text-xs text-neutral-500'>
          {t('image_viewer.loading')}
        </div>
      ) : errorMessage ? (
        <div className='absolute inset-0 flex w-full items-center justify-center text-nowrap text-center text-xs text-red-500'>
          {errorMessage}
        </div>
      ) : (
        <img
          ref={imgRef}
          src={useThumbnail ? displaySrc : src || convertFileSrc(path)}
          alt={path}
          className={cn('max-h-full object-contain', imgClassName)}
          loading='lazy'
          draggable={false}
        />
      )}
    </div>
  );
});

export default memo(ImageViewer);
