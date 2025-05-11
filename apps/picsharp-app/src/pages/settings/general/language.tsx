import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/i18n';
import { memo } from 'react';
import useSettingsStore from '@/store/settings';
import useSelector from '@/hooks/useSelector';
import { SettingsKey } from '@/constants';
import SettingItem from '../setting-item';

const languages = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en-US', label: 'English(US)' },
];

export default memo(function SettingsGeneralLanguage() {
  const { i18n } = useTranslation();
  const t = useI18n();
  const { language, set } = useSettingsStore(useSelector([SettingsKey.Language, 'set']));

  const handleChangeLanguage = async (value: string) => {
    await set(SettingsKey.Language, value);
    i18n.changeLanguage(value);
  };
  return (
    <SettingItem
      title={t('settings.general.language.title')}
      description={t('settings.general.language.description')}
    >
      <Select value={language} onValueChange={handleChangeLanguage}>
        <SelectTrigger>
          <SelectValue placeholder={t('settings.general.language.title')} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {languages.map((language) => (
              <SelectItem key={language.value} value={language.value}>
                {language.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </SettingItem>
  );
});
