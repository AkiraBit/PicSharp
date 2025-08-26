import { useEffect, useState, useMemo, useRef } from 'react';
import FileCard from './file-card';
import useCompressionStore from '@/store/compression';
import useSelector from '@/hooks/useSelector';
import Toolbar from './toolbar';
import ToolbarPagination from './toolbar-pagination';
import { Empty } from 'antd';
import { isValidArray, preventDefault } from '@/utils';
import { useNavigate } from '@/hooks/useNavigate';
import { useI18n } from '@/i18n';
import { ScrollArea, ScrollAreaRef } from '@/components/ui/scroll-area';
import { useUpdateEffect } from 'ahooks';

function FileManager() {
  const { files } = useCompressionStore(useSelector(['files']));
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const navigate = useNavigate();
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

  useEffect(() => {
    const state = useCompressionStore.getState();
    if (!isValidArray(state.files)) {
      state.reset();
      navigate('/compression/classic/guide');
    }
  }, []);

  useUpdateEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollToTop();
    }
  }, [pageIndex]);

  return (
    <ScrollArea
      className='relative h-full min-w-[350px] flex-col'
      onContextMenu={preventDefault}
      ref={scrollAreaRef}
    >
      {isValidArray(dataList) ? (
        <div className='w-full flex-1 px-3 pt-1'>
          <div
            className='grid grid-cols-2 gap-3 pb-[65px] contain-layout sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7'
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
        <div className='flex flex-1 items-center justify-center'>
          <Empty description={t('no_data')} />
        </div>
      )}
      <div className='absolute bottom-2 left-[50%] flex translate-x-[-50%] flex-col gap-1'>
        {files.length > pageSize && (
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
        <Toolbar mode='classic' />
      </div>
    </ScrollArea>
  );
}

export default FileManager;
