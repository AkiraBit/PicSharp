import { memo } from 'react';
import { Badge } from '@/components/ui/badge';

export interface ImgTagProps {
  type: string;
}

function ImgTag(props: ImgTagProps) {
  const { type } = props;
  return (
    <Badge variant='blue' className='h-[18px] rounded-sm border-none px-[6px] py-[0px] text-[12px]'>
      {type.toUpperCase()}
    </Badge>
  );
}

export default memo(ImgTag);
