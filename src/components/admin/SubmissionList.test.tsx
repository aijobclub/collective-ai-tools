import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubmissionList from './SubmissionList';

const fetchMock = vi.mocked(global.fetch);
let categories: string[];
beforeEach(() => {
  categories = [];
  fetchMock.mockImplementation(async (url, init) => ({
    ok: true,
    json: async () => String(url) === '/api/filters'
      ? { categories: [{ _id: 'dev', name: 'Development' }] }
      : init?.method === 'POST' ? {} : [{
        _id: 'submission', type: 'tool', data: { name: 'Example', description: 'A tool', url: 'https://example.com', categories },
        user: { name: 'User', email: 'user@example.com' }, createdAt: '2026-01-01',
      }],
  }) as Response);
});

it('lets an admin categorize and approve an uncategorized tool', async () => {
  render(<SubmissionList />);
  const approve = await screen.findByRole('button', { name: 'Approve' });
  expect(approve).toBeDisabled();
  const user = userEvent.setup();
  await user.click(screen.getByPlaceholderText('Search and select categories...'));
  await user.click(screen.getByRole('button', { name: 'Development' }));
  await user.click(approve);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/admin/submissions/submission/approve', expect.objectContaining({
    method: 'POST', body: JSON.stringify({ categories: ['dev'] }),
  })));
  expect(await screen.findByText(/No pending submissions/)).toBeInTheDocument();
});

it('keeps rejection available without a category', async () => {
  render(<SubmissionList />);
  await userEvent.click(await screen.findByRole('button', { name: 'Reject' }));
  expect(await screen.findByText(/No pending submissions/)).toBeInTheDocument();
});

it('preselects existing categories', async () => {
  categories = ['dev'];
  render(<SubmissionList />);
  expect(await screen.findByRole('button', { name: 'Approve' })).toBeEnabled();
  expect(await screen.findByText('Development')).toBeInTheDocument();
});

it('retains a pending submission and its selection when approval fails', async () => {
  categories = ['dev'];
  const original = fetchMock.getMockImplementation();
  if (!original) throw new Error('Fetch mock is not initialized');
  fetchMock.mockImplementation(async (url, init) => init?.method === 'POST'
    ? { ok: false, status: 400, json: async () => ({ error: 'Category no longer exists' }) } as Response
    : original(url, init));
  render(<SubmissionList />);
  await userEvent.click(await screen.findByRole('button', { name: 'Approve' }));
  expect(await screen.findByText('Category no longer exists')).toBeInTheDocument();
  expect(screen.getByText('Example')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled();
});

it('reports category loading failures while leaving rejection available', async () => {
  const original = fetchMock.getMockImplementation();
  if (!original) throw new Error('Fetch mock is not initialized');
  fetchMock.mockImplementation(async (url, init) => String(url) === '/api/filters'
    ? { ok: false, status: 500 } as Response : original(url, init));
  render(<SubmissionList />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load categories');
  expect(await screen.findByRole('button', { name: 'Reject' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
});
