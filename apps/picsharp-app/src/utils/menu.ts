import { platform } from "@tauri-apps/plugin-os";
import {
  Menu,
  Submenu,
  PredefinedMenuItem,
  MenuItem,
} from "@tauri-apps/api/menu";
import { Window } from "@tauri-apps/api/window";
import { Webview } from "@tauri-apps/api/webview";

export default async function createAppMenu() {
  const submenu = await Submenu.new({
    text: "Nothing",
    items: [
      {
        text: "Do nothing",
        enabled: false,
      },
    ],
  });

  const setting = await MenuItem.new({
    text: "设置",
    id: "setting",
    action: async () => {
      const settingWindow = new Window("Tinyimg:setting", {
        center: true,
        resizable: false,
        fullscreen: false,
      });
      await settingWindow.setTitle("设置");
      // await settingWindow.show();
      const webview = new Webview(settingWindow, "Tinyimg:setting1", {
        url: "/setting",
        x: 0,
        y: 0,
        width: 600,
        height: 800,
        devtools: true,
      });
      webview.once("tauri://created", function () {
        console.log("created");
      });
      webview.once("tauri://error", function (e) {
        console.log("Failed", e);
      });
      // await webview
    },
  });

  const menu = await await Menu.default();
  const m = await menu.items();
  //@ts-ignore
  await (platform() === "macos" ? menu.setAsAppMenu() : menu.setAsWindowMenu());
}
