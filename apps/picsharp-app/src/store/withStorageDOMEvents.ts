import { Mutate, StoreApi } from 'zustand';
type StoreWithPersist = Mutate<StoreApi<any>, [['zustand/persist', unknown]]>;

export const withStorageDOMEvents = (store: StoreWithPersist) => {
  const storageEventCallback = (e: StorageEvent) => {
    console.log(`[Storage Event]:`, e);
    if (e.key === store.persist.getOptions().name && e.newValue) {
      store.persist.rehydrate();
    }
  };

  window.addEventListener('storage', storageEventCallback);

  return () => {
    window.removeEventListener('storage', storageEventCallback);
  };
};
