import { useEffect, useState, useMemo } from 'react';
import FileCard from './file-card';
import useCompressionStore from '@/store/compression';
import useSelector from '@/hooks/useSelector';
import Toolbar from './toolbar';
import ToolbarPagination from './toolbar-pagination';
import { Empty } from 'antd';
import { isValidArray, preventDefault } from '@/utils';
import { useNavigate } from '@/hooks/useNavigate';
import { useI18n } from '@/i18n';

function FileManager() {
  const { files } = useCompressionStore(useSelector(['files']));
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const navigate = useNavigate();
  const t = useI18n();
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

  return (
    <div className='relative flex h-full flex-col items-center' onContextMenu={preventDefault}>
      {isValidArray(dataList) ? (
        <div className='w-full flex-1 p-4'>
          <div
            className='grid grid-cols-1 gap-4 contain-layout sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8'
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
      <div className='sticky bottom-2 flex flex-col gap-1'>
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
    </div>
  );
}

export default FileManager;
