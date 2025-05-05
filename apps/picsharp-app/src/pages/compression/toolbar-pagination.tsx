import { memo } from 'react';
import { Pagination } from 'antd';

export interface ToolbarPaginationProps {
  total: number;
  current: number;
  pageSize: number;
  onChange: (page: number, pageSize: number) => void;
}

export default memo(function ToolbarPagination(props: ToolbarPaginationProps) {
  const { total, current, pageSize, onChange } = props;

  return (
    <div className='rounded-xl border bg-background p-1 shadow-lg dark:border-neutral-600 dark:bg-neutral-800'>
      <Pagination defaultCurrent={current} total={total} pageSize={pageSize} onChange={onChange} />
    </div>
  );
});
