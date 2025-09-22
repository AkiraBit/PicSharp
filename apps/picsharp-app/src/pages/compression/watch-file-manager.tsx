import { memo, useState, useMemo, useRef } from 'react';
import FileCard from './file-card';
import useCompressionStore from '@/store/compression';
import useSelector from '@/hooks/useSelector';
import Toolbar from './toolbar';
import ToolbarPagination from './toolbar-pagination';
import { isValidArray } from '@/utils';
import { useI18n } from '@/i18n';
import { Empty } from 'antd';
import { useUpdateEffect } from 'ahooks';
import { ScrollArea, ScrollAreaRef } from '@/components/ui/scroll-area';
import { preventDefault } from '@/utils';
import { cn } from '@/lib/utils';

function WatchFileManager() {
  const { files } = useCompressionStore(useSelector(['files']));

  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const t = useI18n();
  const scrollAreaRef = useRef<ScrollAreaRef>(null);

  const dataList = useMemo(() => {
    let list = files.slice((pageIndex - 1) * pageSize, pageIndex * pageSize);
    if (list.length === 0 && pageIndex !== 1) {
      list = files.slice((pageIndex - 2) * pageSize, (pageIndex - 1) * pageSize);
      setPageIndex(pageIndex - 1);
    }
    return list;
  }, [files, pageIndex, pageSize]);

  useUpdateEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollToTop();
    }
  }, [pageIndex]);

  const hasPagination = files.length > pageSize;

  return (
    <ScrollArea
      className='relative h-full min-w-[350px]'
      onContextMenu={preventDefault}
      ref={scrollAreaRef}
    >
      {isValidArray(dataList) ? (
        <div className={cn('w-full px-3 pt-1', hasPagination ? 'pb-[110px]' : 'pb-[65px]')}>
          <div
            className='grid grid-cols-2 gap-3 contain-layout sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7'
            style={{
              contentVisibility: 'auto',
            }}
          >
            {dataList.map((file) => (
              <FileCard key={file.path} path={file.path} />
            ))}
          </div>
        </div>
      ) : (
        <div className='flex h-[calc(100vh-48px)] items-center justify-center'>
          <Empty description={t('tips.watching')} />
        </div>
      )}
      <div className='absolute bottom-2 left-[50%] flex translate-x-[-50%] flex-col gap-1'>
        {hasPagination && (
          <ToolbarPagination
            total={files.length}
            current={pageIndex}
            pageSize={pageSize}
            onChange={(pageIndex, pageSize) => {
              if (pageIndex) {
                setPageIndex(pageIndex);
              }
              if (pageSize) {
                setPageSize(pageSize);
              }
            }}
          />
        )}
        <Toolbar mode='watch' />
      </div>
    </ScrollArea>
  );
}

export default memo(WatchFileManager);
