import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import UserDashboard from './UserDashboard';

const auth = vi.hoisted(() => ({
  user: { id: 'alice', name: 'Alice' } as { id: string; name: string } | null,
  loading: false,
}));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('./SavedFavorites', () => ({
  default: () => <div>My saved collections</div>,
}));
vi.mock('./SEO', () => ({ default: () => null }));
const data = {
  summary: { total: 2, pending: 1, approved: 1, rejected: 0 },
  pagination: { page: 1, pages: 2, total: 2, limit: 1 },
  submissions: [
    {
      id: 'one',
      name: 'My app',
      type: 'tool',
      status: 'approved',
      submittedAt: '2026-01-01',
      linkState: 'linked',
      listing: {
        id: 'tool1',
        name: 'My app',
        path: '/tools/tool1',
        views: 42,
        websiteClicks: 8,
        reviewCount: 2,
        averageRating: 4.5,
      },
    },
  ],
};
beforeEach(() => {
  auth.loading = false;
  auth.user = { id: 'alice', name: 'Alice' };
  vi.mocked(fetch).mockResolvedValue(Response.json(data));
});
const setup = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path='/dashboard' element={<UserDashboard />} />
        <Route path='/login' element={<p>Sign in</p>} />
      </Routes>
    </MemoryRouter>
  );
it('shows submissions, measured app engagement, collections and pagination', async () => {
  vi.mocked(fetch).mockImplementation(async () => Response.json(data));
  setup();
  await screen.findByRole('heading', { name: 'My app' });
  expect(screen.getByRole('link', { name: 'View listing' })).toHaveAttribute(
    'href',
    '/tools/tool1'
  );
  expect(screen.getByText('42')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  await vi.waitFor(() =>
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(([url]) => String(url).includes('page=2'))
    ).toBe(true)
  );
  fireEvent.click(screen.getByRole('button', { name: 'My apps' }));
  await vi.waitFor(() =>
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(([url]) => String(url).includes('status=approved'))
    ).toBe(true)
  );
  fireEvent.click(screen.getByRole('button', { name: 'My collections' }));
  expect(screen.getByText('My saved collections')).toBeInTheDocument();
});
it('handles errors with retry, and does not fabricate metrics for older approvals', async () => {
  vi.mocked(fetch)
    .mockResolvedValueOnce(
      Response.json({ error: 'Unavailable' }, { status: 503 })
    )
    .mockResolvedValueOnce(
      Response.json({
        ...data,
        submissions: [
          { ...data.submissions[0], listing: null, linkState: 'unlinked' },
        ],
      })
    );
  setup();
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await screen.findByText(/older approval/);
  expect(screen.queryByText('42')).not.toBeInTheDocument();
});
it('does not request private data when logged out', () => {
  auth.user = null;
  setup();
  expect(fetch).not.toHaveBeenCalled();
});
it('does not present untracked MCP client detail views as measured zero traffic', async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json({ ...data, submissions: [{ ...data.submissions[0], type: 'client', listing: { ...data.submissions[0].listing, views: 0 } }] }));
  setup(); await screen.findByText('Not tracked');
});
it('waits for authentication before requesting private data', () => {
  auth.loading = true; setup();
  expect(screen.getByRole('status')).toHaveTextContent('Loading your account');
  expect(fetch).not.toHaveBeenCalled();
});
it('filters status, refreshes, and allows returning to the previous page', async () => {
  vi.mocked(fetch).mockImplementation(async () => Response.json(data));
  setup(); await screen.findByRole('heading', { name: 'My app' });
  fireEvent.change(screen.getByLabelText('Submission status'), { target: { value: 'pending' } });
  await vi.waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes('status=pending'))).toBe(true));
  await screen.findByRole('heading', { name: 'My app' });
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  await screen.findByRole('heading', { name: 'My app' });
  fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
  await screen.findByRole('heading', { name: 'My app' });
  fireEvent.click(screen.getByRole('button', { name: 'Refresh dashboard' }));
  await screen.findByRole('heading', { name: 'My app' });
  expect(fetch).toHaveBeenCalledTimes(5);
});
it.each([
  ['pending', 'unlinked', 'Your submission is awaiting moderator review.'],
  ['rejected', 'unlinked', 'This submission was not approved. You can submit an updated listing for review.'],
  ['approved', 'unavailable', 'The linked listing is no longer available. Metrics cannot be shown.'],
])('explains %s submissions without invented performance', async (status, linkState, message) => {
  vi.mocked(fetch).mockResolvedValue(Response.json({ ...data, submissions: [{ ...data.submissions[0], status, linkState, listing: null }] }));
  setup(); await screen.findByText(message);
  expect(screen.queryByText('Listing views')).not.toBeInTheDocument();
});
it('shows empty and unrated states without inventing a zero-star rating', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({ ...data, submissions: [], pagination: { page: 1, pages: 0, total: 0, limit: 10 } })).mockResolvedValueOnce(Response.json({ ...data, submissions: [{ ...data.submissions[0], listing: { ...data.submissions[0].listing, reviewCount: 0, averageRating: null } }] }));
  setup(); await screen.findByText('You haven’t submitted any tools yet.');
  fireEvent.click(screen.getByRole('button', { name: 'Refresh dashboard' }));
  await screen.findByText('Not rated');
});
