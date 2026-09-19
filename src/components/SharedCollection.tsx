import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SEO from './SEO';
import type { FavoriteEntry } from '@/lib/favoritesStore';

export default function SharedCollection() {
  const { token = '' } = useParams();
  return <SharedCollectionContent key={token} token={token} />;
}
function SharedCollectionContent({ token }: { token: string }) {
  const [collection, setCollection] = useState<{
    name: string;
    entries: FavoriteEntry[];
  }>();
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(
          `/api/favorites/shared/${encodeURIComponent(token)}`,
          { signal: controller.signal, cache: 'no-store' }
        );
        if (!response.ok)
          throw new Error(
            response.status === 404
              ? 'This collection is unavailable. Its link may have been revoked or the collection deleted.'
              : 'Could not load this collection. Please try again.'
          );
        const data = await response.json();
        if (!controller.signal.aborted) {
          setCollection(data.collection);
          setError('');
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setCollection(undefined);
          setError(
            err instanceof Error
              ? err.message
              : 'Could not load this collection.'
          );
        }
      }
    }
    void load();
    const refresh = () => {
      void load();
    };
    window.addEventListener('focus', refresh);
    return () => {
      controller.abort();
      window.removeEventListener('focus', refresh);
    };
  }, [token, attempt]);
  return (
    <section className='mx-auto max-w-5xl space-y-6 px-4 py-12'>
      <SEO
        title={
          collection
            ? `${collection.name} — Shared collection`
            : 'Shared collection'
        }
        description='A read-only collection of AI tools and resources.'
        noindex
        aiFriendly={false}
      />
      <Link to='/' className='text-sm text-blue-600 dark:text-blue-400'>
        ← Explore the directory
      </Link>
      {error ? (
        <div
          role='alert'
          className='space-y-3 text-gray-700 dark:text-gray-300'
        >
          <h1 className='text-2xl font-bold'>Collection unavailable</h1>
          <p>{error}</p>
          <button
            className='rounded border px-3 py-2'
            onClick={() => {
              setError('');
              setAttempt(value => value + 1);
            }}
          >
            Try again
          </button>
        </div>
      ) : !collection ? (
        <p role='status'>Loading collection…</p>
      ) : (
        <>
          <header>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              Shared collection · Read only
            </p>
            <h1 className='mt-2 break-words text-3xl font-bold text-gray-900 dark:text-white'>
              {collection.name}
            </h1>
            <p className='mt-2 text-gray-600 dark:text-gray-400'>
              {collection.entries.length} saved items
            </p>
          </header>
          {!collection.entries.length ? (
            <p className='text-gray-600 dark:text-gray-400'>
              This collection is empty.
            </p>
          ) : (
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {collection.entries.map(item => (
                <Link
                  key={JSON.stringify([item.type, item.key])}
                  to={`/?q=${encodeURIComponent(item.key)}`}
                  className='min-w-0 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800'
                >
                  <span className='text-xs text-gray-600 dark:text-gray-400'>
                    {item.type}
                  </span>
                  <h2 className='mt-1 break-words font-semibold text-gray-900 dark:text-white'>
                    {item.key}
                  </h2>
                  <p className='mt-3 text-sm text-blue-600 dark:text-blue-400'>
                    Find in directory →
                  </p>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
