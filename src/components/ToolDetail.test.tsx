import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ToolDetail from './ToolDetail';

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/lib/analytics', () => ({ captureEvent: vi.fn() }));
const legacy = {
  _id: 'legacy',
  name: 'Existing Tool',
  description: 'Existing description',
  url: 'https://example.com',
  tags: ['coding'],
  views: 7,
  pricing: [{ _id: 'free', name: 'Free', slug: 'free' }],
};
let data: Record<string, unknown>;
beforeEach(() => {
  data = legacy;
  vi.mocked(fetch).mockImplementation(async (input, init) => {
    const url = String(input);
    if (url.startsWith('/api/ai-tools/'))
      return {
        ok: true,
        json: async () => ({
          data,
          related: [{ ...legacy, _id: 'related', name: 'Related Tool' }],
        }),
      } as Response;
    if (url.startsWith('/api/reviews/'))
      return {
        ok: true,
        json: async () => ({
          reviews: [],
          count: 0,
          average: null,
          totalPages: 0,
        }),
      } as Response;
    if (url === '/api/analytics/view' && init?.method === 'POST')
      return { ok: true, json: async () => ({ views: 8 }) } as Response;
    throw new Error(`Unexpected request ${url}`);
  });
});
function show() {
  return render(
    <MemoryRouter initialEntries={['/tools/legacy']}>
      <Routes>
        <Route path='/tools/:toolId' element={<ToolDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

it('renders old records honestly, links related tools, and saves favorites', async () => {
  show();
  expect(
    await screen.findByRole('heading', { name: 'Existing Tool' })
  ).toBeInTheDocument();
  expect(screen.queryByText('Ideal use cases')).not.toBeInTheDocument();
  expect(
    screen.getByText(/No pricing verification date provided/)
  ).toBeInTheDocument();
  expect(await screen.findByText('8 views')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Related Tool/ })).toHaveAttribute(
    'href',
    '/tools/related'
  );
  expect(screen.getByRole('link', { name: /Visit website/ })).toHaveAttribute(
    'target',
    '_blank'
  );
  await userEvent.click(screen.getByRole('button', { name: 'Save tool' }));
  expect(localStorage.setItem).toHaveBeenCalledWith(
    'favoriteTools',
    '["Existing Tool"]'
  );
  expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://collectiveai.tools/tools/legacy'
  );
});

it('renders supplied rich data and actual pricing provenance', async () => {
  data = {
    ...legacy,
    useCases: ['Review code'],
    limitations: ['Needs internet'],
    examples: ['Review a pull request'],
    alternatives: ['Other Tool'],
    pricingDetails: 'Free plan has limits',
    pricingUrl: 'https://example.com/pricing',
    pricingCheckedAt: '2026-01-01',
  };
  show();
  expect(await screen.findByText('Review code')).toBeInTheDocument();
  expect(screen.getByText('Needs internet')).toBeInTheDocument();
  expect(screen.getByText('Review a pull request')).toBeInTheDocument();
  expect(
    screen.getByText(/Pricing checked by contributor on 2026-01-01/)
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Other Tool' })).toHaveAttribute(
    'href',
    '/?q=Other%20Tool'
  );
});

it('shows missing tools without recording a view and marks the page noindex', async () => {
  vi.mocked(fetch).mockResolvedValue({ ok: false, status: 404 } as Response);
  show();
  expect(await screen.findByRole('alert')).toHaveTextContent('Tool not found');
  await waitFor(() =>
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, follow'
    )
  );
  expect(fetch).not.toHaveBeenCalledWith(
    '/api/analytics/view',
    expect.anything()
  );
});
