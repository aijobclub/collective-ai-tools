import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ReviewSection from './ReviewSection';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));
const empty = { reviews: [], count: 0, average: null, totalPages: 0 };
beforeEach(() => {
  vi.mocked(fetch).mockReset();
});
function show() {
  return render(
    <MemoryRouter>
      <ReviewSection targetId='t1' targetType='tool' />
    </MemoryRouter>
  );
}

it('saves a review then refreshes the real aggregate', async () => {
  let saved = false;
  vi.mocked(fetch).mockImplementation(async (_url, init) => {
    if (init?.method === 'POST') {
      saved = true;
      return { ok: true } as Response;
    }
    return {
      ok: true,
      json: async () =>
        saved
          ? {
              ...empty,
              count: 1,
              average: 4,
              reviews: [
                {
                  _id: 'r1',
                  user: { name: 'Ada' },
                  rating: 4,
                  comment: 'Good for code review',
                  createdAt: '2026-01-01',
                },
              ],
            }
          : empty,
    } as Response;
  });
  show();
  await screen.findByText('No ratings yet');
  await userEvent.click(screen.getByRole('button', { name: '4 stars' }));
  await userEvent.type(
    screen.getByLabelText('Your experience'),
    'Good for code review'
  );
  await userEvent.click(screen.getByRole('button', { name: 'Save review' }));
  expect(
    await screen.findByText('4.0 out of 5 · 1 review')
  ).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(
    '/api/reviews',
    expect.objectContaining({
      body: JSON.stringify({
        targetId: 't1',
        targetType: 'tool',
        rating: 4,
        comment: 'Good for code review',
      }),
    })
  );
});

it('preserves review input and displays a server rejection', async () => {
  vi.mocked(fetch).mockImplementation(async (_url, init) =>
    init?.method === 'POST'
      ? ({
          ok: false,
          json: async () => ({ error: 'Sign in again' }),
        } as Response)
      : ({ ok: true, json: async () => empty } as Response)
  );
  show();
  await screen.findByText('No ratings yet');
  await userEvent.click(screen.getByRole('button', { name: '3 stars' }));
  await userEvent.type(
    screen.getByLabelText('Your experience'),
    'My experience'
  );
  await userEvent.click(screen.getByRole('button', { name: 'Save review' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Sign in again');
  expect(screen.getByLabelText('Your experience')).toHaveValue('My experience');
});

it('retries a failed review load instead of presenting an empty collection', async () => {
  vi.mocked(fetch)
    .mockResolvedValueOnce({ ok: false } as Response)
    .mockResolvedValue({ ok: true, json: async () => empty } as Response);
  show();
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Could not load reviews'
  );
  expect(screen.queryByText('No ratings yet')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Retry reviews' }));
  await waitFor(() =>
    expect(screen.getByText('No ratings yet')).toBeInTheDocument()
  );
});
