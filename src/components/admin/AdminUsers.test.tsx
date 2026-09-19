import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminUsers from './AdminUsers';

const fetchMock = vi.mocked(global.fetch);
beforeEach(() => {
  fetchMock.mockImplementation(async input => {
    const page = Number(new URL(String(input), 'https://example.com').searchParams.get('page') || 1);
    const start = (page - 1) * 10;
    return { ok: true, json: async () => ({
      data: Array.from({ length: Math.min(10, 38 - start) }, (_, index) => ({
        _id: String(start + index + 1), name: `User ${start + index + 1}`,
        email: `user${start + index + 1}@example.com`, role: 'user', createdAt: '2026-01-01',
      })),
      pagination: { page, limit: 10, total: 38, pages: 4 },
    }) } as Response;
  });
});

it('makes all 38 users reachable across four pages and supports going back', async () => {
  render(<AdminUsers />);
  const user = userEvent.setup();
  expect(await screen.findByText('Showing 1 to 10 of 38 users')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  const seen = new Set<string>();
  for (let page = 1; page <= 4; page++) {
    await screen.findByText(`Page ${page} of 4`);
    for (const name of screen.getAllByRole('heading', { level: 3 })) seen.add(name.textContent || '');
    if (page < 4) await user.click(screen.getByRole('button', { name: 'Next' }));
  }
  expect(seen.size).toBe(38);
  expect(screen.getByText('Showing 31 to 38 of 38 users')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Previous' }));
  expect(await screen.findByText('Showing 21 to 30 of 38 users')).toBeInTheDocument();
});

it('shows an empty state without invalid page counts', async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } }) } as Response);
  render(<AdminUsers />);
  expect(await screen.findByText('No users found.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
});

it('reports HTTP failures and lets the admin retry', async () => {
  fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'Server error' }) } as Response);
  render(<AdminUsers />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load users');
  await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('Showing 1 to 10 of 38 users')).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
});
