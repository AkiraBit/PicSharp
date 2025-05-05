import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '../../../i18n';
import { memo } from 'react';
import useSettingsStore from '../../../store/settings';
import useSelector from '@/hooks/useSelector';
import { SettingsKey, SettingsCompressionAction as Action } from '@/constants';

export default memo(function SettingsCompressionAction() {
  const t = useI18n();
  const { compression_action, set } = useSettingsStore(
    useSelector([SettingsKey.compression_action, 'set']),
  );

  const actions = [
    {
      value: Action.Auto,
      label: t('settings.compression.action.auto'),
    },
    {
      value: Action.Remote,
      label: t('settings.compression.action.remote'),
    },
    {
      value: Action.Local,
      label: t('settings.compression.action.local'),
    },
  ];

  const handleChangeAction = async (value: string) => {
    await set(SettingsKey.compression_action, value);
  };

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between gap-x-10'>
        <div>
          <CardTitle className='text-lg'>{t('settings.compression.action')}</CardTitle>
          <CardDescription>
            {t(`settings.compression.action.description.${compression_action}`)}
          </CardDescription>
        </div>
        <Select value={compression_action} onValueChange={handleChangeAction}>
          <SelectTrigger className='w-[180px]'>
            <SelectValue placeholder={t('settings.compression.action')} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {actions.map((action) => (
                <SelectItem key={action.value} value={action.value}>
                  {action.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </CardHeader>
    </Card>
  );
});
