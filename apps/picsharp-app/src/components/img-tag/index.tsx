import { memo } from 'react';
import { Badge } from '@/components/ui/badge';

export interface ImgTagProps {
  type: string;
}

function ImgTag(props: ImgTagProps) {
  const { type } = props;
  switch (type) {
    case 'png':
      return <Badge variant='blue'>PNG</Badge>;
    case 'jpg':
      return <Badge variant='green'>JPG</Badge>;
    case 'jpeg':
      return <Badge variant='green'>JPEG</Badge>;
    case 'webp':
      return <Badge variant='cyan'>WEBP</Badge>;
    case 'avif':
      return <Badge variant='purple'>AVIF</Badge>;
    default:
      return null;
  }
}

export default memo(ImgTag);
