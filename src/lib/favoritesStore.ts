export const FAVORITE_TYPES = [
  'tool',
  'mcp',
  'prompt',
  'skill',
  'repo',
] as const;
export type FavoriteType = (typeof FAVORITE_TYPES)[number];
export type FavoriteEntry = { type: FavoriteType; key: string };
type Favorites = Record<FavoriteType, Set<string>>;
export interface FavoritesState {
  accountId?: string;
  favorites: Favorites;
  status: 'ready' | 'loading' | 'saving' | 'error';
  loaded: boolean;
  error: string;
  account: boolean;
}
export interface FavoritesStore {
  getSnapshot: () => FavoritesState;
  subscribe: (listener: () => void) => () => void;
  toggle: (type: FavoriteType, key: string) => void;
  retry: () => void;
  start: () => () => void;
}
const empty = (): Favorites => ({
  tool: new Set(),
  mcp: new Set(),
  prompt: new Set(),
  skill: new Set(),
  repo: new Set(),
});
const storageKey = (type: FavoriteType) =>
  type === 'tool' ? 'favoriteTools' : `favorites_${type}`;
export const favoriteEntries = (favorites: Favorites): FavoriteEntry[] =>
  FAVORITE_TYPES.flatMap(type =>
    [...favorites[type]].map(key => ({ type, key }))
  );

function readGuest(): Favorites {
  const result = empty();
  for (const type of FAVORITE_TYPES) {
    try {
      const values: unknown = JSON.parse(
        localStorage.getItem(storageKey(type)) || '[]'
      );
      if (Array.isArray(values))
        result[type] = new Set(
          values.filter(
            (value): value is string =>
              typeof value === 'string' && !!value.trim()
          )
        );
    } catch {
      /* Keep other categories usable if one legacy value is malformed. */
    }
  }
  return result;
}

function observable(initial: FavoritesState) {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set: (update: Partial<FavoritesState>) => {
      state = { ...state, ...update };
      listeners.forEach(listener => listener());
    },
  };
}

export function createGuestFavoritesStore(): FavoritesStore {
  const store = observable({
    favorites: empty(),
    status: 'ready',
    loaded: true,
    error: '',
    account: false,
  });
  let retryChange: (() => void) | undefined;
  const save = (type: FavoriteType, key: string, saved: boolean) => {
    const favorites = readGuest();
    if (saved) favorites[type].add(key);
    else favorites[type].delete(key);
    try {
      localStorage.setItem(
        storageKey(type),
        JSON.stringify([...favorites[type]])
      );
      retryChange = undefined;
      store.set({ favorites, status: 'ready', error: '' });
      window.dispatchEvent(new Event('favorites-updated'));
    } catch {
      retryChange = () => save(type, key, saved);
      store.set({
        status: 'error',
        error:
          'Browser storage is unavailable. Your change could not be saved.',
      });
    }
  };
  const refresh = () => {
    const favorites = readGuest();
    if (
      JSON.stringify(favoriteEntries(favorites)) !==
      JSON.stringify(favoriteEntries(store.getSnapshot().favorites))
    )
      store.set({ favorites });
  };
  return {
    getSnapshot: store.getSnapshot,
    subscribe: listener => {
      const unsubscribe = store.subscribe(listener);
      refresh();
      window.addEventListener('storage', refresh);
      window.addEventListener('favorites-updated', refresh);
      return () => {
        unsubscribe();
        window.removeEventListener('storage', refresh);
        window.removeEventListener('favorites-updated', refresh);
      };
    },
    start: () => {
      refresh();
      return () => {};
    },
    retry: () => {
      if (retryChange) retryChange();
      else refresh();
    },
    toggle: (type, key) => {
      save(type, key, !readGuest()[type].has(key));
    },
  };
}

export function createAccountFavoritesStore(accountId: string): FavoritesStore {
  const store = observable({
    accountId,
    favorites: empty(),
    status: 'loading',
    loaded: false,
    error: '',
    account: true,
  });
  let controller: AbortController | undefined;
  let retryChange: (() => void) | undefined;
  const notifyKey = `ct-favorites-updated:${accountId}`;
  const busy = () => ['loading', 'saving'].includes(store.getSnapshot().status);
  const active = (signal: AbortSignal) =>
    !signal.aborted && controller?.signal === signal;

  async function request(
    path: string,
    signal: AbortSignal,
    body?: unknown,
    method = 'POST'
  ) {
    const response = await fetch(`/api/favorites${path}`, {
      method: body === undefined ? 'GET' : method,
      signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Favorites-Account': accountId,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(
        result.error || 'Favorites could not sync. Please try again.'
      );
    }
    return response.json();
  }

  function broadcast() {
    try {
      localStorage.setItem(notifyKey, `${Date.now()}:${Math.random()}`);
    } catch {
      /* No account favorites are stored in this browser. */
    }
  }

  async function load(signal: AbortSignal) {
    store.set({ status: 'loading', error: '' });
    try {
      const guest = favoriteEntries(readGuest());
      for (let offset = 0; offset < guest.length; offset += 100) {
        const batch = guest.slice(offset, offset + 100);
        await request('/import', signal, { favorites: batch });
        if (!active(signal)) return;
        // Clear only acknowledged guest entries. Failed imports stay recoverable.
        const remaining = readGuest();
        batch.forEach(({ type, key }) => remaining[type].delete(key));
        for (const type of new Set(batch.map(item => item.type))) {
          localStorage.setItem(
            storageKey(type),
            JSON.stringify([...remaining[type]])
          );
        }
        window.dispatchEvent(new Event('favorites-updated'));
        broadcast();
      }
      const response = await request('', signal);
      if (!active(signal)) return;
      if (!Array.isArray(response.favorites))
        throw new Error('Could not read your favorites. Please try again.');
      const favorites = empty();
      for (const item of response.favorites as FavoriteEntry[]) {
        if (FAVORITE_TYPES.includes(item.type) && typeof item.key === 'string')
          favorites[item.type].add(item.key);
      }
      store.set({ favorites, loaded: true, status: 'ready', error: '' });
    } catch (error) {
      if (active(signal))
        store.set({
          status: 'error',
          error:
            error instanceof Error
              ? error.message
              : 'Could not sync favorites.',
        });
    }
  }

  async function save(type: FavoriteType, key: string, saved: boolean) {
    const signal = controller?.signal;
    if (!signal || !active(signal) || busy() || !store.getSnapshot().loaded)
      return;
    const previous = store.getSnapshot().favorites;
    const favorites = { ...previous, [type]: new Set(previous[type]) };
    if (saved) favorites[type].add(key);
    else favorites[type].delete(key);
    retryChange = undefined;
    store.set({ favorites, status: 'saving', error: '' });
    try {
      await request('', signal, { type, key, saved }, 'PUT');
      if (!active(signal)) return;
      store.set({ status: 'ready' });
      broadcast();
    } catch (error) {
      if (!active(signal)) return;
      retryChange = () => {
        void save(type, key, saved);
      };
      store.set({
        favorites: previous,
        status: 'error',
        error:
          error instanceof Error
            ? error.message
            : 'Could not save your change.',
      });
    }
  }

  return {
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,
    toggle: (type, key) => {
      void save(type, key, !store.getSnapshot().favorites[type].has(key));
    },
    retry: () => {
      if (busy()) return;
      if (retryChange) retryChange();
      else if (controller) void load(controller.signal);
    },
    start: () => {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      void load(current.signal);
      const refresh = () => {
        if (!busy() && !retryChange && !current.signal.aborted)
          void load(current.signal);
      };
      const onStorage = (event: StorageEvent) => {
        if (event.key === notifyKey) refresh();
      };
      const onVisibility = () => {
        if (document.visibilityState === 'visible') refresh();
      };
      window.addEventListener('focus', refresh);
      window.addEventListener('storage', onStorage);
      document.addEventListener('visibilitychange', onVisibility);
      return () => {
        current.abort();
        window.removeEventListener('focus', refresh);
        window.removeEventListener('storage', onStorage);
        document.removeEventListener('visibilitychange', onVisibility);
      };
    },
  };
}
