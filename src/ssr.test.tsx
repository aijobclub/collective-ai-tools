import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderApp } from './entry-server';

const id = '0123456789abcdef01234567';
const tool = {
  _id: id,
  name: 'Hydration test tool',
  description: 'Real public content',
  tags: [],
  categories: [],
  pricing: [],
  url: 'https://example.com',
};
const consoleError = console.error;
beforeEach(() => {
  // happy-dom makes Headless UI select its browser effect; the production Node
  // bundle does not emit this warning. Do not suppress other rendering errors.
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    if (String(args[0]).includes('useLayoutEffect does nothing on the server'))
      return;
    consoleError(...args);
  });
});
afterEach(() => vi.restoreAllMocks());
describe('shared public React rendering', () => {
  it('renders the real discovery controls and preloaded cards instead of a separate layout', async () => {
    const html = await renderApp('/', {
      '/api/ai-tools?limit=12&sort=popular': { data: [tool] },
    });
    expect(html).toContain('Search tools, MCP servers, prompts, skills, repos');
    expect(html).toContain('Hydration test tool');
    expect(html).toContain('actually worth using');
    expect(html).not.toContain('public-ssr');
    expect(html).not.toContain('animate-pulse');
  });
  it('renders the real tool detail with preloaded data', async () => {
    const html = await renderApp(`/tools/${id}`, {
      [`/api/ai-tools/${id}`]: { data: tool, related: [] },
    });
    expect(html).toContain('Hydration test tool');
    expect(html).toContain('Reviews');
    expect(html).not.toContain('Loading tool');
  });
  it('keeps request snapshots isolated during concurrent rendering', async () => {
    const [first, second] = await Promise.all([
      renderApp(`/tools/${id}`, {
        [`/api/ai-tools/${id}`]: {
          data: { ...tool, name: 'First request' },
          related: [],
        },
      }),
      renderApp(`/tools/${id}`, {
        [`/api/ai-tools/${id}`]: {
          data: { ...tool, name: 'Second request' },
          related: [],
        },
      }),
    ]);
    expect(first).toContain('First request');
    expect(first).not.toContain('Second request');
    expect(second).toContain('Second request');
    expect(second).not.toContain('First request');
  });
  it('renders query-driven controls with the same URL state as the browser', async () => {
    const html = await renderApp('/?q=example', {});
    expect(html).toContain('value="example"');
  });
  it.each([
    [
      '/tools',
      '/api/ai-tools?limit=1000',
      { data: [tool] },
      'Hydration test tool',
    ],
    [
      '/leaderboard',
      '/api/ai-tools/leaderboard',
      { data: [{ ...tool, rank: 1, recordedViews: 42 }] },
      'Hydration test tool',
    ],
    [
      '/skills',
      '/api/skills',
      {
        data: [
          {
            id,
            name: 'Seeded skill',
            description: 'Review code',
            category: 'coding',
            tags: [],
            compatibleAgents: [],
            repo: 'https://example.com',
            stars: 0,
            installCommand: 'npx example',
          },
        ],
        categories: [],
      },
      'Seeded skill',
    ],
    [
      '/prompts',
      '/api/prompts?limit=50&sort=rating',
      {
        prompts: [
          {
            _id: id,
            title: 'Seeded prompt',
            content: 'Explain this code',
            tags: [],
            votes: [],
            rating: 0,
          },
        ],
      },
      'Seeded prompt',
    ],
    [
      '/trending',
      '/api/trending-repos',
      {
        data: [
          {
            title: 'SeededRepo',
            description: 'Repository',
            link: 'https://example.com',
          },
        ],
      },
      'SeededRepo',
    ],
    [
      '/mcp-catalog',
      '/api/mcp?limit=1000',
      {
        data: [
          {
            _id: id,
            id: 'seeded',
            name: 'Seeded MCP',
            description: 'Read files',
            tags: [],
            categories: [],
          },
        ],
        pagination: { total: 1 },
      },
      'Seeded MCP',
    ],
    [
      '/mcp-catalog/seeded',
      '/api/mcp?id=seeded&limit=1',
      {
        data: [
          {
            _id: id,
            id: 'seeded',
            name: 'Seeded MCP',
            description: 'Read files',
            tags: [],
            categories: [],
          },
        ],
      },
      'Seeded MCP',
    ],
  ])(
    'renders populated React content at %s',
    async (path, endpoint, data, content) => {
      const html = await renderApp(path as string, {
        [endpoint as string]: data,
      });
      expect(html).toContain(content);
      expect(html).not.toContain('public-ssr');
    }
  );
});
