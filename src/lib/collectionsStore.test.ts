import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import {
  COLLECTIONS_KEY,
  createCollectionsStore,
  type NamedCollection,
} from './collectionsStore';

const guest: NamedCollection = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Guest collection',
  entries: [{ type: 'tool', key: 'Example' }],
  shareToken: null,
};
let storage: Map<string, string>;
let database: Map<string, Map<string, NamedCollection>>;
let failure: string;
const stops: (() => void)[] = [];
const start = (account?: string) => {
  const store = createCollectionsStore(account);
  stops.push(store.start());
  return store;
};
const ready = async (store: ReturnType<typeof createCollectionsStore>) => {
  await waitFor(() => expect(store.getSnapshot().busy).toBe(false));
};
beforeEach(() => {
  storage = new Map();
  database = new Map();
  failure = '';
  vi.mocked(localStorage.getItem).mockImplementation(
    key => storage.get(key) ?? null
  );
  vi.mocked(localStorage.setItem).mockImplementation((key, value) => {
    storage.set(key, value);
  });
  vi.mocked(fetch).mockImplementation(async (url, options) => {
    const method = options?.method;
    if (failure === method)
      return Response.json({ error: 'Connection failed' }, { status: 503 });
    const account = (options?.headers as Record<string, string>)[
      'X-Favorites-Account'
    ];
    const db = database.get(account) || new Map();
    database.set(account, db);
    const id = String(url).split('/').pop() || '';
    const body = options?.body ? JSON.parse(String(options.body)) : {};
    if (method === 'GET')
      return Response.json({ collections: [...db.values()] });
    if (method === 'PUT' && !db.has(id))
      db.set(id, { id, ...body, shareToken: null });
    if (method === 'DELETE') db.delete(id);
    if (method === 'PATCH') {
      const item = db.get(id);
      if (!item) return Response.json({ error: 'Not found' }, { status: 404 });
      if ('name' in body) item.name = body.name;
      if ('public' in body)
        item.shareToken = body.public ? 'a'.repeat(48) : null;
      if (body.entry) {
        item.entries = item.entries.filter(
          (entry: { type: string; key: string }) =>
            entry.type !== body.entry.type || entry.key !== body.entry.key
        );
        if (body.saved) item.entries.push(body.entry);
      }
    }
    return Response.json({ collection: db.get(id), success: true });
  });
});
afterEach(() => {
  stops.splice(0).forEach(stop => stop());
});

it('persists guest edits, membership and deletion without touching favorite keys', async () => {
  storage.set('favoriteTools', '["Example"]');
  const store = start();
  await ready(store);
  expect(await store.create(' My stack ')).toBe(true);
  const id = store.getSnapshot().collections[0].id;
  await store.change(id, { entry: guest.entries[0], saved: true });
  await store.change(id, { entry: guest.entries[0], saved: true });
  await store.change(id, { name: 'Renamed' });
  expect(store.getSnapshot().collections[0]).toMatchObject({
    name: 'Renamed',
    entries: guest.entries,
  });
  const next = start();
  await ready(next);
  expect(next.getSnapshot().collections).toEqual(
    store.getSnapshot().collections
  );
  await store.change(id, { entry: guest.entries[0], saved: false });
  expect(store.getSnapshot().collections[0].entries).toEqual([]);
  await store.remove(id);
  expect(store.getSnapshot().collections).toEqual([]);
  expect(storage.get('favoriteTools')).toBe('["Example"]');
});
it('does not lose malformed guest storage or pretend blocked writes worked', async () => {
  storage.set(COLLECTIONS_KEY, 'broken');
  const bad = start();
  await ready(bad);
  expect(bad.getSnapshot().loaded).toBe(false);
  expect(storage.get(COLLECTIONS_KEY)).toBe('broken');
  storage.set(COLLECTIONS_KEY, '[]');
  bad.retry();
  await ready(bad);
  vi.mocked(localStorage.setItem).mockImplementation(() => {
    throw new Error('blocked');
  });
  expect(await bad.create('New')).toBe(false);
  expect(bad.getSnapshot().collections).toEqual([]);
  vi.mocked(localStorage.setItem).mockImplementation((key, value) => {
    storage.set(key, value);
  });
  bad.retry();
  await ready(bad);
  expect(bad.getSnapshot().collections).toHaveLength(1);
});
it('validates names and refuses public sharing for guests', async () => {
  const store = start();
  await ready(store);
  expect(await store.create(' ')).toBe(false);
  expect(await store.create('x'.repeat(81))).toBe(false);
  await store.create('Private');
  expect(
    await store.change(store.getSnapshot().collections[0].id, { public: true })
  ).toBe(false);
  expect(store.getSnapshot().collections[0].shareToken).toBeNull();
});
it('imports guest collections into an account only after acknowledgment', async () => {
  storage.set(COLLECTIONS_KEY, JSON.stringify([guest]));
  failure = 'PUT';
  const store = start('alice');
  await ready(store);
  expect(JSON.parse(storage.get(COLLECTIONS_KEY) || '[]')).toEqual([guest]);
  expect(store.getSnapshot().loaded).toBe(false);
  failure = '';
  store.retry();
  await ready(store);
  expect(store.getSnapshot().collections).toEqual([guest]);
  expect(storage.get(COLLECTIONS_KEY)).toBe('[]');
});
it('syncs on another device, isolates accounts, and never caches account contents locally', async () => {
  const first = start('alice');
  await ready(first);
  await first.create('Private');
  const id = first.getSnapshot().collections[0].id;
  await first.change(id, { public: true });
  const second = start('alice');
  await ready(second);
  expect(second.getSnapshot().collections[0].shareToken).toBe('a'.repeat(48));
  const bob = start('bob');
  await ready(bob);
  expect(bob.getSnapshot().collections).toEqual([]);
  await second.change(id, { public: false });
  window.dispatchEvent(new Event('focus'));
  await ready(first);
  expect(first.getSnapshot().collections[0].shareToken).toBeNull();
  await second.remove(id);
  window.dispatchEvent(new Event('focus'));
  await ready(first);
  expect(first.getSnapshot().collections).toEqual([]);
  expect(storage.get(COLLECTIONS_KEY)).toBeUndefined();
});
it('preserves the visible collection on failure and retries the exact operation', async () => {
  const store = start('alice');
  await ready(store);
  await store.create('Original');
  const id = store.getSnapshot().collections[0].id;
  failure = 'PATCH';
  expect(await store.change(id, { name: 'Renamed' })).toBe(false);
  expect(store.getSnapshot().collections[0].name).toBe('Original');
  failure = '';
  store.retry();
  await ready(store);
  expect(store.getSnapshot().collections[0].name).toBe('Renamed');
});
it('ignores stale responses after leaving an account', async () => {
  let resolve: (response: Response) => void = () => {};
  vi.mocked(fetch).mockImplementationOnce(
    () =>
      new Promise(done => {
        resolve = done;
      })
  );
  const store = start('alice');
  stops.pop()?.();
  resolve(Response.json({ collections: [guest] }));
  await new Promise(done => setTimeout(done, 0));
  expect(store.getSnapshot().collections).toEqual([]);
});
it('preserves changed guest snapshots instead of clearing data the account did not accept', async () => {
  const edited = {
    ...guest,
    entries: [
      ...guest.entries,
      { type: 'prompt' as const, key: 'Added later' },
    ],
  };
  storage.set(COLLECTIONS_KEY, JSON.stringify([edited]));
  database.set('alice', new Map([[guest.id, structuredClone(guest)]]));
  const store = start('alice');
  await ready(store);
  expect(
    store.getSnapshot().collections.some(item => item.entries.length === 2)
  ).toBe(true);
  expect(storage.get(COLLECTIONS_KEY)).toBe('[]');
});
