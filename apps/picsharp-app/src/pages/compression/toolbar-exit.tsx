import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import useCompressionStore from '@/store/compression';
import useSelector from '@/hooks/useSelector';
import { useNavigate } from '@/hooks/useNavigate';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useI18n } from '@/i18n';

function ToolbarExit(props: { mode: 'classic' | 'watch' }) {
  const navigate = useNavigate();
  const { inCompressing } = useCompressionStore(useSelector(['inCompressing']));
  const t = useI18n();
  const handleExit = () => {
    if (props.mode === 'classic') {
      navigate('/compression/classic/guide');
    } else {
      navigate('/compression/watch/guide');
    }
    toast.dismiss();
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          onClick={handleExit}
          disabled={inCompressing}
          className='dark:hover:bg-neutral-700/50'
        >
          <LogOut className='h-4 w-4' />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t('quit')}</TooltipContent>
    </Tooltip>
  );
}

export default memo(ToolbarExit);
