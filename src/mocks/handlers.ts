/**
 * @license
 * MIT
 * Collective AI Tools (https://collectiveai.tools)
 */
import { http, HttpResponse } from 'msw';
import type { FavoriteEntry } from '@/lib/favoritesStore';
import type { NamedCollection, CollectionChange } from '@/lib/collectionsStore';
import {
  mockAITools,
  mockCategories,
  mockLanguages,
  mockMCPServers,
  mockPricingTiers,
  mockPrompts,
  mockSkills,
  mockTrendingRepos,
  mockUser,
} from './data';

const pagination = (total: number) => ({ total, page: 1, limit: 20, totalPages: 1 });
const mockViews = new Map<string, number>();
const mockFavorites = new Map<string, FavoriteEntry>();
const mockCollections = new Map<string, NamedCollection>();
const mockSubmissions: { id: string; name: string; type: string; status: 'pending'; submittedAt: string; listing: null; linkState: 'unlinked' }[] = [];
const mockReviews = new Map<string, { _id: string; user: typeof mockUser; rating: number; comment: string; createdAt: string }>();

export const handlers = [
  http.get('/api/submissions', ({ request }) => {
    const query = new URL(request.url).searchParams;
    const page = Number(query.get('page') || 1);
    const limit = Number(query.get('limit') || 10);
    const rows = query.get('status') && query.get('status') !== 'pending' ? [] : mockSubmissions;
    return HttpResponse.json({ submissions: rows.slice((page - 1) * limit, page * limit), summary: { total: mockSubmissions.length, pending: mockSubmissions.length, approved: 0, rejected: 0 }, pagination: { total: rows.length, page, limit, pages: Math.ceil(rows.length / limit) } });
  }),
  http.post('/api/analytics/click', () => HttpResponse.json({ success: true })),
  http.get('/api/favorites/collections', () => HttpResponse.json({ collections: [...mockCollections.values()] })),
  http.put('/api/favorites/collections/:id', async ({ params, request }) => {
    const id = String(params.id);
    const body = await request.json() as { name: string; entries: FavoriteEntry[] };
    if (!mockCollections.has(id)) mockCollections.set(id, { id, ...body, shareToken: null });
    return HttpResponse.json({ collection: mockCollections.get(id) });
  }),
  http.patch('/api/favorites/collections/:id', async ({ params, request }) => {
    const collection = mockCollections.get(String(params.id));
    if (!collection) return HttpResponse.json({ error: 'Collection not found' }, { status: 404 });
    const body = await request.json() as CollectionChange;
    if ('name' in body) collection.name = body.name;
    if ('public' in body) collection.shareToken = body.public ? collection.shareToken || (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '').slice(0, 48) : null;
    if ('entry' in body) {
      collection.entries = collection.entries.filter(item => item.type !== body.entry.type || item.key !== body.entry.key);
      if (body.saved) collection.entries.push(body.entry);
    }
    return HttpResponse.json({ collection });
  }),
  http.delete('/api/favorites/collections/:id', ({ params }) => {
    mockCollections.delete(String(params.id)); return HttpResponse.json({ success: true });
  }),
  http.get('/api/favorites/shared/:token', ({ params }) => {
    const collection = [...mockCollections.values()].find(item => item.shareToken === params.token);
    return collection ? HttpResponse.json({ collection: { name: collection.name, entries: collection.entries } }) : HttpResponse.json({ error: 'Collection unavailable' }, { status: 404 });
  }),
  http.get('/api/favorites', () => HttpResponse.json({ favorites: [...mockFavorites.values()] })),
  http.put('/api/favorites', async ({ request }) => {
    const { type, key, saved } = await request.json() as FavoriteEntry & { saved: boolean };
    const id = JSON.stringify([type, key]);
    if (saved) mockFavorites.set(id, { type, key }); else mockFavorites.delete(id);
    return HttpResponse.json({ type, key, saved });
  }),
  http.post('/api/favorites/import', async ({ request }) => {
    const { favorites } = await request.json() as { favorites: FavoriteEntry[] };
    favorites.forEach(item => mockFavorites.set(JSON.stringify([item.type, item.key]), item));
    return HttpResponse.json({ success: true });
  }),
  http.get('/api/filters', () =>
    HttpResponse.json({ categories: mockCategories, languages: mockLanguages, pricing: mockPricingTiers }),
  ),

  http.get('/api/stats', () =>
    HttpResponse.json({ aiTools: mockAITools.length, mcpServers: mockMCPServers.length, mcpClients: 0 }),
  ),

  http.get('/api/ai-tools', () =>
    HttpResponse.json({ data: mockAITools, pagination: pagination(mockAITools.length) }),
  ),

  http.get('/api/ai-tools/leaderboard', () => {
    const tools = mockAITools.map(tool => ({ ...tool, recordedViews: mockViews.get(tool._id) ?? 0 }))
      .filter(tool => tool.recordedViews > 0)
      .sort((a, b) => b.recordedViews - a.recordedViews || a.name.localeCompare(b.name)).slice(0, 50);
    let rank = 0;
    return HttpResponse.json({ metric: 'recordedViews', limit: 50, data: tools.map((tool, index) => {
      if (!index || tool.recordedViews !== tools[index - 1].recordedViews) rank = index + 1;
      return { ...tool, rank };
    }) });
  }),
  http.get('/api/ai-tools/:id', ({ params }) => {
    const tool = mockAITools.find(item => item._id === params.id);
    return tool ? HttpResponse.json({ data: { ...tool, views: mockViews.get(tool._id) ?? 0 }, related: mockAITools.filter(item => item._id !== tool._id && item.categories.some(c => tool.categories.some(tc => tc._id === c._id))) }) : HttpResponse.json({ error: 'Tool not found' }, { status: 404 });
  }),
  http.post('/api/analytics/view', async ({ request }) => {
    const { id } = await request.json() as { id: string };
    const views = (mockViews.get(id) ?? 0) + 1;
    mockViews.set(id, views);
    return HttpResponse.json({ views });
  }),
  http.get('/api/reviews/:id', ({ params, request }) => {
    const type = new URL(request.url).searchParams.get('type');
    const review = mockReviews.get(`${type}:${params.id}`);
    return HttpResponse.json({ reviews: review ? [review] : [], count: review ? 1 : 0, average: review?.rating ?? null, page: 1, totalPages: review ? 1 : 0 });
  }),
  http.post('/api/reviews', async ({ request }) => {
    const body = await request.json() as { targetId: string; targetType: string; rating: number; comment: string };
    const review = { _id: 'mock-review', user: mockUser, rating: body.rating, comment: body.comment, createdAt: new Date().toISOString() };
    mockReviews.set(`${body.targetType}:${body.targetId}`, review);
    return HttpResponse.json({ review });
  }),

  http.get('/api/mcp', () =>
    HttpResponse.json({ data: mockMCPServers, pagination: pagination(mockMCPServers.length) }),
  ),

  http.get('/api/prompts', () =>
    HttpResponse.json({ prompts: mockPrompts, total: mockPrompts.length, totalPages: 1, currentPage: 1 }),
  ),

  http.get('/api/skills', () => HttpResponse.json({ data: mockSkills })),

  http.get('/api/trending-repos', () => HttpResponse.json({ data: mockTrendingRepos })),

  // Auth — mocked as "always succeeds" so contributors can exercise logged-in
  // UI states without a real account. Not meant to simulate real validation.
  http.post('/api/auth/login', () => HttpResponse.json({ user: mockUser })),
  http.post('/api/auth/register', () => HttpResponse.json({ user: mockUser }, { status: 201 })),
  http.get('/api/auth/me', () => HttpResponse.json({ user: mockUser })),
  http.post('/api/auth/logout', () => HttpResponse.json({ message: 'Logged out' })),

  // Submissions — accepts anything, echoes back a fake pending submission.
  http.post('/api/submissions', async ({ request }) => {
    const body = (await request.json()) as { type?: string; data?: unknown };
    const id = crypto.randomUUID();
    const name = (body.data as { name?: string } | undefined)?.name || 'Demo submission';
    mockSubmissions.unshift({ id, name, type: body.type || 'tool', status: 'pending', submittedAt: new Date().toISOString(), listing: null, linkState: 'unlinked' });
    return HttpResponse.json(
      {
        message: 'Submission received successfully',
        submission: { _id: id, type: body.type, data: body.data, status: 'pending' },
      },
      { status: 201 },
    );
  }),
];
