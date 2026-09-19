import { beforeEach, expect, it, vi } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SavedFavorites from './SavedFavorites';
import { FavoritesContext } from '@/context/FavoritesContext';
import { createGuestFavoritesStore } from '@/lib/favoritesStore';

let storage: Map<string, string>;
beforeEach(() => {
  storage = new Map([['favoriteTools', '["Example Tool"]']]);
  vi.mocked(localStorage.getItem).mockImplementation(
    key => storage.get(key) ?? null
  );
  vi.mocked(localStorage.setItem).mockImplementation((key, value) => {
    storage.set(key, value);
  });
});
function setup() {
  const store = createGuestFavoritesStore();
  store.start();
  return render(
    <MemoryRouter>
      <FavoritesContext.Provider value={store}>
        <SavedFavorites />
      </FavoritesContext.Provider>
    </MemoryRouter>
  );
}
it('creates and renames collections, organizes saved tools and keeps favorites when deleting', async () => {
  setup();
  fireEvent.change(screen.getByLabelText('Collection name'), {
    target: { value: 'Writing' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Create collection' }));
  await screen.findByRole('button', { name: 'Writing (0)' });
  fireEvent.click(screen.getByLabelText('Add Example Tool to Writing'));
  await screen.findByRole('button', { name: 'Writing (1)' });
  fireEvent.click(screen.getByRole('button', { name: 'Writing (1)' }));
  fireEvent.change(screen.getByLabelText('Rename collection'), {
    target: { value: 'Research' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
  await screen.findByRole('button', { name: 'Research (1)' });
  expect(screen.getByText(/Sign in to share/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Delete collection' }));
  const confirmation = screen.getByRole('group', {
    name: 'Confirm collection deletion',
  });
  fireEvent.click(within(confirmation).getByRole('button', { name: 'Delete' }));
  await waitFor(() =>
    expect(
      screen.queryByRole('button', { name: 'Research (1)' })
    ).not.toBeInTheDocument()
  );
  expect(storage.get('favoriteTools')).toBe('["Example Tool"]');
});
it('shows storage failures without creating a phantom collection', async () => {
  setup();
  vi.mocked(localStorage.setItem).mockImplementation(() => {
    throw new Error('Storage blocked');
  });
  fireEvent.change(screen.getByLabelText('Collection name'), {
    target: { value: 'Writing' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Create collection' }));
  await screen.findByRole('alert');
  expect(
    screen.queryByRole('button', { name: 'Writing (0)' })
  ).not.toBeInTheDocument();
});
