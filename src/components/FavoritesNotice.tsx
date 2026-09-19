import { useFavoritesStatus } from '@/hooks/useFavorites';

export default function FavoritesNotice() {
  const { error, isSyncing, retry } = useFavoritesStatus();
  if (!error && !isSyncing) return null;
  return (
    <div className='fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl rounded-xl border border-gray-300 bg-white p-4 text-sm text-gray-900 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'>
      {error ? (
        <div role='alert' className='flex items-center justify-between gap-4'>
          <p>{error}</p>
          <button
            type='button'
            onClick={retry}
            className='shrink-0 rounded px-3 py-2 font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-gray-700'
          >
            Retry
          </button>
        </div>
      ) : (
        <p role='status'>Syncing favorites…</p>
      )}
    </div>
  );
}
