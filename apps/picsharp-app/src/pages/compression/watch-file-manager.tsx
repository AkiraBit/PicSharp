import { memo, useEffect, useState, useMemo, useReducer } from 'react';
import FileCard from './file-card';
import useCompressionStore from '@/store/compression';
import useSelector from '@/hooks/useSelector';
import Toolbar from './toolbar';
import ToolbarPagination from './toolbar-pagination';
import { isValidArray } from '@/utils';
import { Disc3, Binoculars } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Badge } from '@/components/ui/badge';
import { openPath } from '@tauri-apps/plugin-opener';
export interface WatchFileManagerProps {}

function WatchFileManager(props: WatchFileManagerProps) {
  const { files, watchingFolder } = useCompressionStore(useSelector(['files', 'watchingFolder']));

  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const t = useI18n();

  const dataList = useMemo(() => {
    let list = files.slice((pageIndex - 1) * pageSize, pageIndex * pageSize);
    if (list.length === 0 && pageIndex !== 1) {
      list = files.slice((pageIndex - 2) * pageSize, (pageIndex - 1) * pageSize);
      setPageIndex(pageIndex - 1);
    }
    return list;
  }, [files, pageIndex, pageSize]);

  return (
    <div className='relative flex h-full flex-col items-center'>
      {isValidArray(dataList) ? (
        <div className='w-full flex-1 px-3 pb-4 pt-9'>
          <div
            className='grid grid-cols-1 gap-3 contain-layout sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8'
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
        <div className='text-muted-foreground flex flex-1 items-center justify-center'>
          <Binoculars className='text-foreground h-5 w-5 dark:text-neutral-400' />
          <span className='mx-2 text-sm text-neutral-400'>{t('tips.watching')}</span>
        </div>
      )}
      <div className='sticky bottom-2 z-[20] flex flex-col gap-1'>
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
        <Toolbar mode='watch' />
      </div>
    </div>
  );
}

export default memo(WatchFileManager);
