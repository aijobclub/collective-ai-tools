import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Leaderboard from './Leaderboard';

afterEach(() => vi.unstubAllGlobals());
const setup = () =>
  render(
    <MemoryRouter>
      <Leaderboard />
    </MemoryRouter>
  );
const response = (data: unknown[]) => ({
  ok: true,
  json: async () => ({ data, metric: 'recordedViews', limit: 50 }),
});

it('shows loading then ranked tools linking to their details, not seeded view totals', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        response([
          {
            _id: 'abc',
            name: 'Example tool',
            description: 'Description ``',
            rank: 1,
            recordedViews: 12,
            views: 5000,
            categories: [{ _id: 'cat', name: 'Writing' }],
          },
        ])
      )
  );
  setup();
  expect(screen.getByRole('status')).toHaveTextContent('Loading');
  expect(
    await screen.findByRole('link', { name: /Example tool/ })
  ).toHaveAttribute('href', '/tools/abc');
  expect(screen.getByText('12')).toBeInTheDocument();
  expect(screen.queryByText('5,000')).not.toBeInTheDocument();
  expect(screen.getByText('Description')).toBeInTheDocument();
});

it('shows an honest empty state with a browse link', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([])));
  setup();
  expect(
    await screen.findByText('The leaderboard is warming up')
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Explore tools' })).toHaveAttribute(
    'href',
    '/tools'
  );
});

it('offers retry after an API error and recovers', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce({ ok: false })
    .mockResolvedValueOnce(response([]));
  vi.stubGlobal('fetch', fetcher);
  setup();
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByText('The leaderboard is warming up');
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it('treats malformed responses as errors, not empty rankings', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: null }) })
  );
  setup();
  await screen.findByRole('alert');
});

it('aborts its request when leaving the page', () => {
  const fetcher = vi.fn().mockImplementation(() => new Promise(() => {}));
  vi.stubGlobal('fetch', fetcher);
  const { unmount } = setup();
  const signal = fetcher.mock.calls[0][1].signal;
  unmount();
  expect(signal.aborted).toBe(true);
});
