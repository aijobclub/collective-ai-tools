import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { createCollectionsStore } from '@/lib/collectionsStore';

export function useCollections(accountId?: string) {
  const store = useMemo(() => createCollectionsStore(accountId), [accountId]);
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
  useEffect(() => store.start(), [store]);
  return {
    ...state,
    create: store.create,
    change: store.change,
    remove: store.remove,
    retry: store.retry,
  };
}
