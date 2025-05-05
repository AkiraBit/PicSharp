import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { useI18n } from "../../../i18n";
import { memo } from "react";
import useSettingsStore from "../../../store/settings";
import useSelector from "@/hooks/useSelector";
import { SettingsKey } from "@/constants";

const languages = [
  { value: "zh-CN", label: "简体中文" },
  { value: "en-US", label: "English(US)" },
];

export default memo(function SettingsGeneralLanguage() {
  const { i18n } = useTranslation();
  const t = useI18n();
  const { language, set } = useSettingsStore(
    useSelector([SettingsKey.language, "set"])
  );

  const handleChangeLanguage = async (value: string) => {
    await set(SettingsKey.language, value);
    i18n.changeLanguage(value);
  };
  return (
    <CardHeader className="flex flex-row justify-between">
      <div>
        <CardTitle className="text-lg">
          {t("settings.general.language")}
        </CardTitle>
        <CardDescription>
          {t("settings.general.language.description")}
        </CardDescription>
      </div>
      <Select value={language} onValueChange={handleChangeLanguage}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={t("settings.general.language")} />
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
    </CardHeader>
  );
});
