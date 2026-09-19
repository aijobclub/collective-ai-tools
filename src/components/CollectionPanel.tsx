import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Folder, ArrowRight } from 'lucide-react';
import { useCollections } from '@/hooks/useCollections';
import type { FavoriteEntry } from '@/lib/favoritesStore';

const control =
  'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100';
const labels = {
  tool: 'Tool',
  mcp: 'MCP server',
  prompt: 'Prompt',
  skill: 'Skill',
  repo: 'Repository',
};
type Props = {
  accountId?: string;
  favorites: FavoriteEntry[];
  canSave: boolean;
  toggle: (type: FavoriteEntry['type'], key: string) => void;
};

export default function CollectionPanel({
  accountId,
  favorites,
  canSave,
  toggle,
}: Props) {
  const store = useCollections(accountId);
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmShare, setConfirmShare] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const selected = store.collections.find(item => item.id === selectedId);
  const entries = selected ? selected.entries : favorites;
  const disabled = store.busy || !store.loaded;
  const url = selected?.shareToken
    ? `${window.location.origin}/collections/shared/${selected.shareToken}`
    : '';
  const choose = (id: string) => {
    setSelectedId(id);
    setConfirmDelete(false);
    setConfirmShare(false);
    setCopyMessage('');
  };

  return (
    <div className='space-y-5'>
      <div className='rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800/50'>
        <h3 className='flex items-center gap-2 font-semibold text-gray-900 dark:text-white'>
          <Folder className='h-5 w-5' /> Collections
        </h3>
        <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
          Organize saved items into named collections. An item can belong to
          more than one.
        </p>
        <form
          className='mt-4 flex flex-wrap items-end gap-2'
          onSubmit={async event => {
            event.preventDefault();
            if (await store.create(name.trim())) setName('');
          }}
        >
          <label className='w-full min-w-0 text-sm text-gray-700 sm:flex-1 dark:text-gray-300'>
            Collection name
            <input
              value={name}
              onChange={event => setName(event.target.value)}
              required
              maxLength={80}
              placeholder='e.g. My development stack'
              className={`${control} mt-1 block w-full`}
            />
          </label>
          <button
            className={control}
            disabled={disabled || !name.trim()}
            type='submit'
          >
            Create collection
          </button>
        </form>
      </div>
      {store.error && (
        <div
          role='alert'
          className='rounded-lg border border-red-300 p-4 text-sm text-red-700 dark:text-red-300'
        >
          {store.error}{' '}
          <button className={`${control} ml-2`} onClick={store.retry}>
            Retry collections
          </button>
        </div>
      )}
      {store.busy && (
        <p role='status' className='text-sm text-gray-600 dark:text-gray-400'>
          Syncing collections…
        </p>
      )}
      <nav aria-label='Your collections' className='flex flex-wrap gap-2'>
        <button
          className={control}
          aria-pressed={!selected}
          onClick={() => choose('')}
        >
          All saved ({favorites.length})
        </button>
        {store.collections.map(collection => (
          <button
            key={collection.id}
            className={`${control} max-w-full break-words text-left aria-pressed:border-blue-500 aria-pressed:text-blue-600 dark:aria-pressed:text-blue-300`}
            aria-pressed={selected?.id === collection.id}
            onClick={() => choose(collection.id)}
          >
            {collection.name} ({collection.entries.length})
          </button>
        ))}
      </nav>
      {selected && (
        <div className='space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700'>
          <form
            key={`${selected.id}:${selected.name}`}
            className='flex flex-wrap items-end gap-2'
            onSubmit={async event => {
              event.preventDefault();
              const form = event.currentTarget;
              const value = String(new FormData(form).get('name') || '').trim();
              if (value) await store.change(selected.id, { name: value });
            }}
          >
            <label className='w-full min-w-0 text-sm text-gray-700 sm:flex-1 dark:text-gray-300'>
              Rename collection
              <input
                name='name'
                defaultValue={selected.name}
                maxLength={80}
                required
                className={`${control} mt-1 block w-full`}
              />
            </label>
            <button type='submit' disabled={disabled} className={control}>
              Save name
            </button>
            <button
              type='button'
              disabled={disabled}
              className={control}
              onClick={() => setConfirmDelete(true)}
            >
              Delete collection
            </button>
          </form>
          {confirmDelete && (
            <div
              role='group'
              aria-label='Confirm collection deletion'
              className='space-y-2 text-sm text-gray-700 dark:text-gray-300'
            >
              <p>
                Delete “{selected.name}”? Your favorites will stay saved. Any
                public link will stop working.
              </p>
              <button
                disabled={disabled}
                className={control}
                onClick={async () => {
                  if (await store.remove(selected.id)) choose('');
                }}
              >
                Delete
              </button>{' '}
              <button
                className={control}
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
            </div>
          )}
          {!accountId ? (
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              <Link
                to='/login'
                className='text-blue-600 underline dark:text-blue-400'
              >
                Sign in to share
              </Link>{' '}
              this collection. It will be synced to your account.
            </p>
          ) : selected.shareToken ? (
            <div className='space-y-2'>
              <p className='text-sm text-gray-600 dark:text-gray-400'>
                Anyone with this link can view this collection. Changes to its
                name and items are visible immediately.
              </p>
              <label className='block text-sm text-gray-700 dark:text-gray-300'>
                Public collection link
                <input
                  readOnly
                  value={url}
                  onFocus={event => event.target.select()}
                  className={`${control} mt-1 w-full`}
                />
              </label>
              <div className='flex flex-wrap gap-2'>
                <button
                  className={control}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(url);
                      setCopyMessage('Link copied.');
                    } catch {
                      setCopyMessage('Select and copy the link above.');
                    }
                  }}
                >
                  Copy link
                </button>
                <Link
                  className={control}
                  to={`/collections/shared/${selected.shareToken}`}
                >
                  Preview public page
                </Link>
                <button
                  disabled={disabled}
                  className={control}
                  onClick={() => {
                    void store.change(selected.id, { public: false });
                  }}
                >
                  Revoke public link
                </button>
              </div>
              {copyMessage && (
                <p
                  role='status'
                  className='text-sm text-gray-600 dark:text-gray-400'
                >
                  {copyMessage}
                </p>
              )}
            </div>
          ) : (
            <div className='space-y-2'>
              <p className='text-sm text-gray-600 dark:text-gray-400'>
                Private collection. Only you can see it.
              </p>
              {!confirmShare ? (
                <button
                  disabled={disabled}
                  className={control}
                  onClick={() => setConfirmShare(true)}
                >
                  Create public link
                </button>
              ) : (
                <div
                  role='group'
                  aria-label='Confirm public sharing'
                  className='space-y-2 text-sm text-gray-700 dark:text-gray-300'
                >
                  <p>
                    Publish this collection’s name and items to anyone with the
                    link? Your account details and other collections remain
                    private. You can revoke the link, but cannot retract copies
                    others have saved.
                  </p>
                  <button
                    disabled={disabled}
                    className={control}
                    onClick={async () => {
                      if (await store.change(selected.id, { public: true }))
                        setConfirmShare(false);
                    }}
                  >
                    Enable public sharing
                  </button>{' '}
                  <button
                    className={control}
                    onClick={() => setConfirmShare(false)}
                  >
                    Cancel sharing
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {!entries.length ? (
        <p className='rounded-xl border border-gray-200 p-6 text-gray-600 dark:border-gray-700 dark:text-gray-400'>
          {selected
            ? 'This collection is empty. Open All saved and use Organize to add items.'
            : 'No saved favorites yet. Use the heart on a tool or resource to save it here.'}
        </p>
      ) : (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {entries.map(({ type, key }) => (
            <article
              key={JSON.stringify([type, key])}
              className='min-w-0 space-y-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800'
            >
              <div className='flex items-center gap-3'>
                <Link
                  to={`/?q=${encodeURIComponent(key)}`}
                  className='min-w-0 flex-1'
                >
                  <span className='text-xs text-gray-600 dark:text-gray-400'>
                    {labels[type]}
                  </span>
                  <h3 className='mt-1 break-words font-semibold text-gray-900 dark:text-white'>
                    {key}
                  </h3>
                  <span className='mt-2 inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400'>
                    Find in directory <ArrowRight className='h-3 w-3' />
                  </span>
                </Link>
                {!selected && (
                  <button
                    type='button'
                    aria-label={`Remove ${key} from favorites`}
                    disabled={!canSave}
                    onClick={() => toggle(type, key)}
                    className='rounded-full p-2 text-yellow-600 disabled:opacity-50 dark:text-yellow-400'
                  >
                    <Heart className='h-5 w-5 fill-current' />
                  </button>
                )}
              </div>
              {selected ? (
                <button
                  disabled={disabled}
                  className={control}
                  onClick={() => {
                    void store.change(selected.id, {
                      entry: { type, key },
                      saved: false,
                    });
                  }}
                >
                  Remove from collection
                </button>
              ) : (
                !!store.collections.length && (
                  <details className='text-sm text-gray-700 dark:text-gray-300'>
                    <summary className='cursor-pointer'>Organize</summary>
                    <div className='mt-2 space-y-2'>
                      {store.collections.map(collection => (
                        <label
                          key={collection.id}
                          className='flex items-start gap-2 break-words'
                        >
                          <input
                            type='checkbox'
                            aria-label={`Add ${key} to ${collection.name}`}
                            disabled={disabled}
                            checked={collection.entries.some(
                              item => item.type === type && item.key === key
                            )}
                            onChange={event => {
                              void store.change(collection.id, {
                                entry: { type, key },
                                saved: event.target.checked,
                              });
                            }}
                            className='mt-1'
                          />
                          {collection.name}
                        </label>
                      ))}
                    </div>
                  </details>
                )
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
