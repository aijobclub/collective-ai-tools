import { Link } from 'react-router-dom';
import { useFavoritesStatus } from '@/hooks/useFavorites';
import { favoriteEntries } from '@/lib/favoritesStore';
import CollectionPanel from './CollectionPanel';

export default function SavedFavorites() {
  const { favorites, account, accountId, loaded, error, canSave, toggle } =
    useFavoritesStatus();
  return (
    <section aria-labelledby='saved-favorites-heading' className='space-y-5'>
      <div>
        <h2
          id='saved-favorites-heading'
          className='text-2xl font-bold text-gray-900 dark:text-white'
        >
          Saved favorites
        </h2>
        <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
          {account ? (
            'Your private favorites, synced across devices when you sign in.'
          ) : (
            <>
              Saved in this browser.{' '}
              <Link
                className='text-blue-600 underline dark:text-blue-400'
                to='/login'
              >
                Sign in
              </Link>{' '}
              to keep them with your account.
            </>
          )}
        </p>
      </div>
      {!loaded ? (
        <p role='status' className='text-gray-600 dark:text-gray-400'>
          {error
            ? 'Your favorites could not be loaded. Use Retry to try again.'
            : 'Loading your favorites…'}
        </p>
      ) : (
        <CollectionPanel
          key={accountId || 'guest'}
          accountId={accountId}
          favorites={favoriteEntries(favorites)}
          canSave={canSave}
          toggle={toggle}
        />
      )}
    </section>
  );
}
