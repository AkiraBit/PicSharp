import { Mutate, StoreApi } from 'zustand';
type StoreWithPersist = Mutate<StoreApi<any>, [['zustand/persist', unknown]]>;

type StorageEventCallback = (e: StorageEvent) => void | Promise<void>;
const map = new Map<StoreWithPersist, StorageEventCallback>();

const storageEventCallback = (e: StorageEvent) => {
  for (const [store, cb] of map.entries()) {
    if (e.key === store.persist.getOptions().name) {
      cb(e);
    }
  }
};
window.addEventListener('storage', storageEventCallback);

export const withStorageDOMEvents = (store: StoreWithPersist, cb: StorageEventCallback) => {
  map.set(store, cb);
};
