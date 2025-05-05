import { memo, useEffect, useState, useMemo, useReducer } from 'react';
import FileCard from './file-card';
import useCompressionStore from '@/store/compression';
import useSelector from '@/hooks/useSelector';
import Toolbar from './toolbar';
import ToolbarPagination from './toolbar-pagination';
import { isValidArray } from '@/utils';
import { Disc3 } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Badge } from '@/components/ui/badge';
export interface WatchFileManagerProps {}

function WatchFileManager(props: WatchFileManagerProps) {
  const { files, watchingFolder } = useCompressionStore(useSelector(['files', 'watchingFolder']));
  const t = useI18n();

  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(100);

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
      <Badge
        variant='secondary'
        className='absolute left-[50%] top-2 -translate-x-1/2 text-nowrap bg-neutral-200/80'
      >
        {`Watching ${watchingFolder}`}
      </Badge>
      {isValidArray(dataList) ? (
        <div className='w-full flex-1 px-4 pb-4 pt-9'>
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
        <div className='text-muted-foreground flex flex-1 items-center justify-center'>
          <Disc3 className='h-16 w-16 text-foreground dark:text-neutral-400' />
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
        <Toolbar mode='watch' />
      </div>
    </div>
  );
}

export default memo(WatchFileManager);
