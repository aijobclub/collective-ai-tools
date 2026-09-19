import { createContext, useEffect, useMemo, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  createAccountFavoritesStore,
  createGuestFavoritesStore,
} from '@/lib/favoritesStore';

const guestStore = createGuestFavoritesStore();
export const FavoritesContext = createContext(guestStore);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const accountId = user?.id;
  const store = useMemo(
    () => (accountId ? createAccountFavoritesStore(accountId) : guestStore),
    [accountId]
  );
  useEffect(() => {
    if (!loading) return store.start();
  }, [store, loading]);
  return (
    <FavoritesContext.Provider value={store}>
      {children}
    </FavoritesContext.Provider>
  );
}
