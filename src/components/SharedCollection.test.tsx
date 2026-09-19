import { expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SharedCollection from './SharedCollection';

function setup() {
  render(
    <MemoryRouter initialEntries={['/collections/shared/token']}>
      <Routes>
        <Route
          path='/collections/shared/:token'
          element={<SharedCollection />}
        />
      </Routes>
    </MemoryRouter>
  );
}
it('shows public content read-only without account details or edit controls', async () => {
  vi.mocked(fetch).mockResolvedValue(
    Response.json({
      collection: {
        name: 'Writing',
        entries: [{ type: 'tool', key: 'Example' }],
      },
    })
  );
  setup();
  await screen.findByRole('heading', { name: 'Writing' });
  expect(screen.getByRole('link', { name: /Example/ })).toHaveAttribute(
    'href',
    '/?q=Example'
  );
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
it('shows revoked links as unavailable and supports retry', async () => {
  vi.mocked(fetch)
    .mockResolvedValueOnce(Response.json({}, { status: 404 }))
    .mockResolvedValueOnce(
      Response.json({ collection: { name: 'Restored', entries: [] } })
    );
  setup();
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByRole('heading', { name: 'Restored' });
});
