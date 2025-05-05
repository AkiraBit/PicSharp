import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useI18n } from "../../../i18n";
import { memo } from "react";
import useSettingsStore from "../../../store/settings";
import useSelector from "@/hooks/useSelector";
import { SettingsKey } from "@/constants";
import { Switch } from "@/components/ui/switch";
import { enable, isEnabled, disable } from "@tauri-apps/plugin-autostart";
import { toast } from "sonner";
import { useAsyncEffect } from "ahooks";

export default memo(function SettingsGeneralAutostart() {
  const t = useI18n();
  const { autostart, set } = useSettingsStore(
    useSelector([SettingsKey.autostart, "set"])
  );

  const handleChangeAutostart = async (value: boolean) => {
    try {
      if (value) {
        await enable();
        toast.success(t("tips.autostart.already_enabled"));
      } else {
        await disable();
        toast.success(t("tips.autostart.already_disabled"));
      }
      set(SettingsKey.autostart, value);
    } catch (error) {
      toast.error(t("tips.autostart.error"));
    }
  };

  useAsyncEffect(async () => {
    const isAutostartEnabled = await isEnabled();
    set(SettingsKey.autostart, isAutostartEnabled);
  }, []);

  return (
    <CardHeader className="flex flex-row justify-between">
      <div>
        <CardTitle className="text-lg">
          {t("settings.general.autostart.title")}
        </CardTitle>
        <CardDescription>
          {t("settings.general.autostart.description")}
        </CardDescription>
      </div>
      <Switch checked={autostart} onCheckedChange={handleChangeAutostart} />
    </CardHeader>
  );
});
