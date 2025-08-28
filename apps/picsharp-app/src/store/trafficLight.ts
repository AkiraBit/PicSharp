import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { isMac } from '@/utils';

const WINDOW_CONTROL_PAD_X = 10.0;
const WINDOW_CONTROL_PAD_Y = 22.0;

interface TrafficLightState {
  isTrafficLightVisible: boolean;
  shouldShowTrafficLight: boolean;
}

interface TrafficLightAction {
  setTrafficLightVisibility: (visible: boolean) => void;
  initializeTrafficLightListeners: () => Promise<void>;
  cleanupTrafficLightListeners: () => void;
  unlistenEnterFullScreen?: () => void;
  unlistenExitFullScreen?: () => void;
}

export const useTrafficLightStore = create<TrafficLightState & TrafficLightAction>((set, get) => {
  return {
    isTrafficLightVisible: isMac,
    shouldShowTrafficLight: isMac,

    setTrafficLightVisibility: async (visible: boolean) => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const currentWindow = getCurrentWindow();
      const isFullscreen = await currentWindow.isFullscreen();
      set({ isTrafficLightVisible: !isFullscreen && visible, shouldShowTrafficLight: visible });
      invoke('set_traffic_lights', {
        visible: visible,
        x: WINDOW_CONTROL_PAD_X,
        y: WINDOW_CONTROL_PAD_Y,
      });
    },

    initializeTrafficLightListeners: async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const currentWindow = getCurrentWindow();

      const unlistenEnterFullScreen = await currentWindow.listen('will-enter-fullscreen', () => {
        set({ isTrafficLightVisible: false });
      });

      const unlistenExitFullScreen = await currentWindow.listen('will-exit-fullscreen', () => {
        const { shouldShowTrafficLight } = get();
        set({ isTrafficLightVisible: shouldShowTrafficLight });
      });

      set({ unlistenEnterFullScreen, unlistenExitFullScreen });
    },

    cleanupTrafficLightListeners: () => {
      const { unlistenEnterFullScreen, unlistenExitFullScreen } = get();
      if (unlistenEnterFullScreen) unlistenEnterFullScreen();
      if (unlistenExitFullScreen) unlistenExitFullScreen();
      set({ unlistenEnterFullScreen: undefined, unlistenExitFullScreen: undefined });
    },
  };
});
