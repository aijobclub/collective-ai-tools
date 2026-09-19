import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import {
  createAccountFavoritesStore,
  createGuestFavoritesStore,
  type FavoriteEntry,
  type FavoritesStore,
} from './favoritesStore';

let storage: Map<string, string>;
let server: Map<string, FavoriteEntry[]>;
let fail: string;
const stops: (() => void)[] = [];
const ready = (store: FavoritesStore) =>
  waitFor(() => expect(store.getSnapshot().status).toBe('ready'));
const start = (id = 'alice') => {
  const store = createAccountFavoritesStore(id);
  stops.push(store.start());
  return store;
};
beforeEach(() => {
  storage = new Map();
  server = new Map();
  fail = '';
  vi.mocked(localStorage.getItem).mockImplementation(
    key => storage.get(key) ?? null
  );
  vi.mocked(localStorage.setItem).mockImplementation((key, value) => {
    storage.set(key, value);
  });
  vi.mocked(fetch).mockImplementation(async (url, options) => {
    const account = (options?.headers as Record<string, string>)[
      'X-Favorites-Account'
    ];
    const method = options?.method;
    if (fail === method)
      return Response.json({ error: 'Offline' }, { status: 503 });
    const current = server.get(account) ?? [];
    const body = options?.body ? JSON.parse(String(options.body)) : undefined;
    if (String(url).endsWith('/import')) {
      for (const entry of body.favorites)
        if (
          !current.some(
            item => item.type === entry.type && item.key === entry.key
          )
        )
          current.push(entry);
      server.set(account, current);
    } else if (method === 'PUT') {
      const next = current.filter(
        item => item.type !== body.type || item.key !== body.key
      );
      if (body.saved) next.push({ type: body.type, key: body.key });
      server.set(account, next);
    }
    return Response.json({
      favorites: server.get(account) ?? [],
      success: true,
    });
  });
});
afterEach(() => {
  stops.splice(0).forEach(stop => stop());
});

describe('favorites persistence', () => {
  it('preserves legacy guest keys and keeps multiple consumers synchronized', () => {
    storage.set('favoriteTools', '["Existing"]');
    storage.set('favorites_mcp', 'broken');
    const a = createGuestFavoritesStore();
    const b = createGuestFavoritesStore();
    stops.push(
      a.subscribe(() => {}),
      b.subscribe(() => {})
    );
    expect(a.getSnapshot().favorites.tool.has('Existing')).toBe(true);
    a.toggle('prompt', 'Prompt');
    expect(b.getSnapshot().favorites.prompt.has('Prompt')).toBe(true);
  });
  it('does not pretend a blocked browser write succeeded', () => {
    const store = createGuestFavoritesStore();
    vi.mocked(localStorage.setItem).mockImplementation(() => {
      throw new Error('blocked');
    });
    store.toggle('tool', 'New');
    expect(store.getSnapshot().status).toBe('error');
    expect(store.getSnapshot().favorites.tool.size).toBe(0);
    vi.mocked(localStorage.setItem).mockImplementation((key, value) => {
      storage.set(key, value);
    });
    store.retry();
    expect(store.getSnapshot().favorites.tool.has('New')).toBe(true);
  });
  it('merges all guest types without replacing account saves and clears acknowledged entries', async () => {
    storage.set('favoriteTools', '["Guest"]');
    storage.set('favorites_mcp', '["Server"]');
    server.set('alice', [{ type: 'tool', key: 'Account' }]);
    const store = start();
    await ready(store);
    expect([...store.getSnapshot().favorites.tool]).toEqual([
      'Account',
      'Guest',
    ]);
    expect(store.getSnapshot().favorites.mcp.has('Server')).toBe(true);
    expect(storage.get('favoriteTools')).toBe('[]');
    expect(storage.get('favorites_mcp')).toBe('[]');
  });
  it('retains guest saves when import fails and retries safely', async () => {
    storage.set('favoriteTools', '["Guest"]');
    fail = 'POST';
    const store = start();
    await waitFor(() => expect(store.getSnapshot().status).toBe('error'));
    expect(storage.get('favoriteTools')).toBe('["Guest"]');
    fail = '';
    store.retry();
    await ready(store);
    expect(store.getSnapshot().favorites.tool.has('Guest')).toBe(true);
  });
  it('imports large existing libraries in bounded batches', async () => {
    storage.set(
      'favoriteTools',
      JSON.stringify(Array.from({ length: 205 }, (_, i) => `Tool ${i}`))
    );
    const store = start();
    await ready(store);
    expect(store.getSnapshot().favorites.tool.size).toBe(205);
    expect(
      vi
        .mocked(fetch)
        .mock.calls.filter(([url]) => String(url).endsWith('/import'))
    ).toHaveLength(3);
  });
  it('rolls back failed changes and retries the original intent', async () => {
    const store = start();
    await ready(store);
    fail = 'PUT';
    store.toggle('tool', 'New');
    await waitFor(() => expect(store.getSnapshot().status).toBe('error'));
    expect(store.getSnapshot().favorites.tool.has('New')).toBe(false);
    fail = '';
    store.retry();
    await ready(store);
    expect(server.get('alice')).toEqual([{ type: 'tool', key: 'New' }]);
  });
  it('loads on another device and refreshes remote removals on focus', async () => {
    const first = start();
    await ready(first);
    first.toggle('tool', 'Shared');
    await ready(first);
    const second = start();
    await ready(second);
    expect(second.getSnapshot().favorites.tool.has('Shared')).toBe(true);
    second.toggle('tool', 'Shared');
    await ready(second);
    window.dispatchEvent(new Event('focus'));
    await ready(first);
    expect(first.getSnapshot().favorites.tool.has('Shared')).toBe(false);
  });
  it('isolates accounts and does not cache private favorites in guest storage', async () => {
    server.set('alice', [{ type: 'tool', key: 'Private' }]);
    const alice = start();
    await ready(alice);
    const bob = start('bob');
    await ready(bob);
    expect(bob.getSnapshot().favorites.tool.size).toBe(0);
    const guest = createGuestFavoritesStore();
    guest.start();
    expect(guest.getSnapshot().favorites.tool.size).toBe(0);
  });
  it('blocks writes before the account has loaded', async () => {
    fail = 'GET';
    const store = start();
    await waitFor(() => expect(store.getSnapshot().status).toBe('error'));
    store.toggle('tool', 'New');
    expect(server.size).toBe(0);
    fail = '';
    store.retry();
    await ready(store);
  });
  it('ignores a response after the account store is stopped', async () => {
    let resolve!: (response: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise(r => {
          resolve = r;
        })
    );
    const store = start();
    stops.pop()?.();
    resolve(Response.json({ favorites: [{ type: 'tool', key: 'Stale' }] }));
    await new Promise(r => setTimeout(r, 0));
    expect(store.getSnapshot().favorites.tool.size).toBe(0);
  });
});
