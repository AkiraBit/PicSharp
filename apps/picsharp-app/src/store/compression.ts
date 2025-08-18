import { create } from 'zustand';
import EventEmitter from 'eventemitter3';
import useAppStore from './app';
import { clearImageViewerCache } from '@/components/image-viewer/cache';

interface CompressionState {
  // 是否正在工作区
  working: boolean;
  // 是否正在压缩
  inCompressing: boolean;
  // 是否正在监控文件夹
  watchingFolder: string;
  eventEmitter: EventEmitter;
  // 文件列表
  files: FileInfo[];
  fileMap: Map<string, FileInfo>;
  // 选中的文件
  selectedFiles: string[];
}

interface CompressionAction {
  setWorking: (value: boolean) => void;
  setInCompressing: (inCompressing: boolean) => void;
  setWatchingFolder: (path: string) => void;
  setFiles: (files: FileInfo[]) => void;
  removeFile: (path: string) => void;
  reset: () => void;
}

const useCompressionStore = create<CompressionState & CompressionAction>((set, get) => ({
  working: false,
  eventEmitter: new EventEmitter(),
  watchingFolder: '',
  files: [],
  fileMap: new Map(),
  selectedFiles: [],
  inCompressing: false,
  setWorking: (value: boolean) => {
    set({ working: value });
  },
  setInCompressing: (inCompressing: boolean) => {
    set({ inCompressing });
  },
  setWatchingFolder: (path) => {
    set({ watchingFolder: path });
  },
  setFiles: (files: FileInfo[]) => {
    set({
      files,
      fileMap: new Map(files.map((file) => [file.path, file])),
      selectedFiles: files.map((file) => file.path),
    });
  },
  removeFile: (path: string) => {
    const targetIndex = get().files.findIndex((file) => file.path === path);
    if (targetIndex !== -1) {
      get().files.splice(targetIndex, 1);
      get().fileMap.delete(path);
      const selectedFiles = get().selectedFiles.filter((file) => file !== path);
      set({
        files: [...get().files],
        fileMap: new Map(get().fileMap),
        selectedFiles,
      });
    }
  },
  reset: () => {
    clearImageViewerCache();
    useAppStore.getState().clearImageCache();
    set({
      working: false,
      inCompressing: false,
      watchingFolder: '',
      files: [],
      fileMap: new Map(),
      selectedFiles: [],
    });
  },
}));

export default useCompressionStore;
