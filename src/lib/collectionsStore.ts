import { z } from 'zod';
import { FAVORITE_TYPES, type FavoriteEntry } from './favoritesStore';

const entrySchema = z.object({
  type: z.enum(FAVORITE_TYPES),
  key: z.string().min(1).max(500),
});
const nameSchema = z.string().trim().min(1).max(80);
const collectionSchema = z.object({
  id: z.uuid(),
  name: nameSchema,
  entries: z.array(entrySchema).max(500),
  shareToken: z
    .string()
    .regex(/^[a-f0-9]{48}$/)
    .nullable(),
});
export type NamedCollection = z.infer<typeof collectionSchema>;
export const COLLECTIONS_KEY = 'ct-guest-collections';
export type CollectionChange =
  | { name: string }
  | { entry: FavoriteEntry; saved: boolean }
  | { public: boolean };
type State = {
  collections: NamedCollection[];
  busy: boolean;
  loaded: boolean;
  error: string;
};

function readGuest(): NamedCollection[] {
  return z
    .array(collectionSchema)
    .parse(JSON.parse(localStorage.getItem(COLLECTIONS_KEY) || '[]'))
    .map(item => ({ ...item, shareToken: null }));
}
export function createCollectionsStore(accountId?: string) {
  let state: State = { collections: [], busy: true, loaded: false, error: '' };
  let controller: AbortController | undefined;
  let retryAction: (() => Promise<boolean>) | undefined;
  const listeners = new Set<() => void>();
  const set = (next: Partial<State>) => {
    state = { ...state, ...next };
    listeners.forEach(fn => fn());
  };
  const notifyKey = accountId
    ? `ct-collections-updated:${accountId}`
    : COLLECTIONS_KEY;
  const active = (signal: AbortSignal) =>
    !signal.aborted && controller?.signal === signal;
  const broadcast = () => {
    if (accountId) {
      try {
        localStorage.setItem(notifyKey, `${Date.now()}:${Math.random()}`);
      } catch {
        /* Account data lives on the server. */
      }
    } else window.dispatchEvent(new Event('collections-updated'));
  };
  async function request(
    path: string,
    method: string,
    signal: AbortSignal,
    body?: unknown
  ) {
    const response = await fetch(`/api/favorites/collections${path}`, {
      method,
      signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Favorites-Account': accountId || '',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(
        data.error || 'Could not sync collections. Please retry.'
      );
    return data;
  }
  async function load(signal: AbortSignal): Promise<boolean> {
    set({ busy: true, error: '' });
    try {
      if (accountId) {
        for (let guest of readGuest()) {
          const response = await request(`/${guest.id}`, 'PUT', signal, {
            name: guest.name,
            entries: guest.entries,
          });
          if (!active(signal)) return false;
          const acknowledged = collectionSchema.parse(response.collection);
          if (
            acknowledged.name !== guest.name ||
            !guest.entries.every(item =>
              acknowledged.entries.some(
                saved => saved.type === item.type && saved.key === item.key
              )
            )
          ) {
            // An earlier import can have succeeded while the response was lost,
            // followed by edits on either device. Preserve both versions rather
            // than overwriting account edits or silently discarding guest data.
            const copy = {
              ...guest,
              id: crypto.randomUUID(),
              name: `${guest.name.slice(0, 65)} (browser copy)`,
            };
            localStorage.setItem(
              COLLECTIONS_KEY,
              JSON.stringify(
                readGuest().map(item =>
                  JSON.stringify(item) === JSON.stringify(guest) ? copy : item
                )
              )
            );
            guest = copy;
            await request(`/${guest.id}`, 'PUT', signal, {
              name: guest.name,
              entries: guest.entries,
            });
            if (!active(signal)) return false;
          }
          // Clear only the exact acknowledged snapshot, not concurrent guest edits.
          const remaining = readGuest().filter(
            item => JSON.stringify(item) !== JSON.stringify(guest)
          );
          localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(remaining));
        }
      }
      const collections = accountId
        ? z
            .array(collectionSchema)
            .parse((await request('', 'GET', signal)).collections)
        : readGuest();
      if (!active(signal)) return false;
      retryAction = undefined;
      set({ collections, loaded: true, busy: false, error: '' });
      return true;
    } catch (error) {
      if (active(signal))
        set({
          busy: false,
          error:
            error instanceof Error && !(error instanceof z.ZodError)
              ? error.message
              : 'Could not read collections. Your browser data has been preserved.',
        });
      return false;
    }
  }
  async function write(
    id: string,
    method: 'PUT' | 'PATCH' | 'DELETE',
    body?: { name: string; entries: FavoriteEntry[] } | CollectionChange
  ): Promise<boolean> {
    const signal = controller?.signal;
    if (!signal || !active(signal) || state.busy || !state.loaded) return false;
    set({ busy: true, error: '' });
    try {
      let collections: NamedCollection[];
      if (accountId) {
        const response = await request(`/${id}`, method, signal, body);
        if (!active(signal)) return false;
        collections = state.collections.filter(item => item.id !== id);
        if (method !== 'DELETE')
          collections.push(collectionSchema.parse(response.collection));
      } else {
        collections = readGuest();
        const existing = collections.find(item => item.id === id);
        if (method === 'DELETE')
          collections = collections.filter(item => item.id !== id);
        else if (method === 'PUT' && body && 'name' in body && !existing)
          collections.push({
            id,
            name: nameSchema.parse(body.name),
            entries: [],
            shareToken: null,
          });
        else if (existing && body) {
          if ('name' in body) existing.name = nameSchema.parse(body.name);
          if ('public' in body)
            throw new Error('Sign in to share a collection.');
          if ('entry' in body) {
            existing.entries = existing.entries.filter(
              item =>
                item.type !== body.entry.type || item.key !== body.entry.key
            );
            if (body.saved) existing.entries.push(body.entry);
          }
        }
        z.array(collectionSchema).parse(collections);
        localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections));
      }
      retryAction = undefined;
      set({ collections, busy: false, error: '' });
      broadcast();
      return true;
    } catch (error) {
      if (active(signal)) {
        retryAction = () => write(id, method, body);
        set({
          busy: false,
          error:
            error instanceof Error && !(error instanceof z.ZodError)
              ? error.message
              : 'Use a name of 1–80 characters and at most 500 items.',
        });
      }
      return false;
    }
  }
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    create: (name: string) =>
      write(crypto.randomUUID(), 'PUT', { name, entries: [] }),
    change: (id: string, change: CollectionChange) =>
      write(id, 'PATCH', change),
    remove: (id: string) => write(id, 'DELETE'),
    retry: () => {
      if (!state.busy && controller)
        void (retryAction ? retryAction() : load(controller.signal));
    },
    start: () => {
      controller?.abort();
      controller = new AbortController();
      const current = controller;
      void load(current.signal);
      const refresh = () => {
        if (!state.busy && !retryAction && active(current.signal))
          void load(current.signal);
      };
      const storage = (event: StorageEvent) => {
        if (event.key === notifyKey) refresh();
      };
      window.addEventListener('focus', refresh);
      window.addEventListener('storage', storage);
      window.addEventListener('collections-updated', refresh);
      return () => {
        current.abort();
        window.removeEventListener('focus', refresh);
        window.removeEventListener('storage', storage);
        window.removeEventListener('collections-updated', refresh);
      };
    },
  };
}
