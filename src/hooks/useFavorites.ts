import { useContext, useSyncExternalStore } from 'react';
import { FavoritesContext } from '@/context/FavoritesContext';
import type { FavoriteType } from '@/lib/favoritesStore';

export function useFavoritesStatus() {
  const store = useContext(FavoritesContext);
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
  return {
    ...state,
    retry: store.retry,
    toggle: store.toggle,
    isSyncing: state.status === 'loading' || state.status === 'saving',
    canSave:
      state.loaded && state.status !== 'loading' && state.status !== 'saving',
  };
}

export function useFavorites(type: FavoriteType) {
  const state = useFavoritesStatus();
  const favorites = state.favorites[type];
  return {
    favorites,
    isFavorite: (key: string) => favorites.has(key),
    toggleFavorite: (key: string) => state.toggle(type, key),
    isSyncing: state.isSyncing,
    canSave: state.canSave,
  };
}

export function useAllFavorites() {
  const state = useFavoritesStatus();
  return {
    isFavoriteAny: (type: string, key: string) =>
      state.favorites[type as FavoriteType]?.has(key) || false,
  };
}
