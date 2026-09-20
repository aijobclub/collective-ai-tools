import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadPublicPage, renderDocument } from './public-pages.mjs';
import { createPublicHandler } from './handler.mjs';

const template = readFileSync('index.html', 'utf8').replace(
  /<link[^>]*rel="stylesheet"[^>]*>/g,
  ''
);
const id = '695933dedece1dcb62245752';
it('embeds matching React HTML and an inert, script-safe hydration snapshot', () => {
  const html = renderDocument(template, {
    path: '/', status: 200, title: 'Example', description: 'Example',
    reactHtml: '<main><h1>Existing layout</h1></main>',
    snapshot: { path: '/', data: { value: '</script><script>alert(1)</script>' } },
  });
  const doc = new DOMParser().parseFromString(html, 'text/html');
  expect(doc.querySelector('#root').dataset.rendered).toBe('react');
  expect(doc.querySelector('#root').innerHTML).toBe('<main><h1>Existing layout</h1></main>');
  expect(doc.querySelector('.public-ssr')).toBeNull();
  const state = doc.querySelector('#public-page-data');
  expect(state.type).toBe('application/json');
  expect(JSON.parse(state.textContent).data.value).toBe('</script><script>alert(1)</script>');
  expect(html).not.toContain('<script>alert(1)</script>');
});
const tool = {
  _id: id,
  name: 'Example Tool',
  description: 'Useful existing description',
  url: 'https://example.com',
  categories: [{ name: 'Writing' }],
  pricing: [{ name: 'Free' }],
  useCases: ['Draft a report'],
  limitations: ['Requires review'],
  examples: ['Summarize a document'],
  alternatives: ['Other Tool'],
  pricingDetails: 'Example pricing',
  pricingCheckedAt: '2026-09-01',
  pricingUrl: 'https://example.com/pricing',
};
const getJson = vi.fn(async path => {
  if (path === `/api/ai-tools/${id}`)
    return { data: tool, related: [{ ...tool, _id: 'related' }] };
  if (path.startsWith('/api/ai-tools/leaderboard'))
    return {
      data: [{ ...tool, recordedViews: 12, rank: 1 }],
      metric: 'recordedViews',
    };
  if (path.startsWith('/api/ai-tools'))
    return { data: [tool], pagination: { total: 1, totalPages: 1 } };
  if (path.startsWith('/api/mcp'))
    return {
      data: [
        {
          id: 'example-server',
          name: 'Example MCP',
          description: 'MCP description',
          githubUrl: 'https://github.com/example/mcp',
          features: ['Read documents'],
        },
      ],
      pagination: { total: 1, totalPages: 1 },
    };
  if (path.startsWith('/api/prompts'))
    return {
      prompts: [
        { title: 'Example Prompt', content: 'Explain this code clearly' },
      ],
    };
  if (path.startsWith('/api/skills'))
    return {
      data: [
        {
          name: 'Example Skill',
          description: 'Review code',
          repo: 'https://github.com/example/skill',
        },
      ],
    };
  if (path.startsWith('/api/trending-repos'))
    return {
      data: [
        {
          title: 'Example Repo',
          description: 'Trending example',
          link: 'https://github.com/example/repo',
        },
      ],
    };
  throw new Error(`Unexpected path ${path}`);
});

describe('public HTML', () => {
  it.each([
    ['/', 'Example Tool'],
    ['/tools', 'Example Tool'],
    [`/tools/${id}`, 'Draft a report'],
    ['/mcp-catalog', 'Example MCP'],
    ['/mcp-catalog/example-server', 'Read documents'],
    ['/prompts', 'Explain this code clearly'],
    ['/skills', 'Example Skill'],
    ['/trending', 'Example Repo'],
    ['/leaderboard', '12'],
    ['/prompt-studio', 'Prompt Studio'],
  ])(
    'delivers real content and exactly one self canonical for %s without JavaScript',
    async (path, content) => {
      const page = await loadPublicPage(path, getJson);
      const html = renderDocument(template, page);
      const doc = new DOMParser().parseFromString(html, 'text/html');
      expect(page.status).toBe(200);
      expect(doc.querySelector('#root').textContent).toContain(content);
      expect(doc.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
      expect(
        doc.querySelector('link[rel="canonical"]').getAttribute('href')
      ).toBe(`https://collectiveai.tools${path}`);
      expect(doc.querySelector('meta[property="og:url"]').content).toBe(
        `https://collectiveai.tools${path}`
      );
      expect(doc.querySelector('title').textContent).toBe(page.title);
    }
  );

  it('includes all existing rich tool data without inventing a verification date', async () => {
    const page = await loadPublicPage(`/tools/${id}`, getJson);
    expect(page.content).toContain('Requires review');
    expect(page.content).toContain('2026-09-01');
    const legacy = await loadPublicPage(`/tools/${id}`, async () => ({
      data: { ...tool, pricingCheckedAt: undefined },
      related: [],
    }));
    expect(legacy.content).toContain('No pricing verification date provided');
  });

  it('escapes untrusted text, scripts, attribute breaks and unsafe URLs', async () => {
    const name = '</script><script>alert(1)</script>" &';
    const page = await loadPublicPage(`/tools/${id}`, async () => ({
      data: {
        ...tool,
        name,
        url: 'javascript:alert(1)',
        pricingUrl: 'data:text/html,bad',
      },
      related: [],
    }));
    const doc = new DOMParser().parseFromString(
      renderDocument(template, page),
      'text/html'
    );
    expect(doc.querySelector('h1').textContent).toBe(name);
    expect(
      [...doc.querySelectorAll('a')].some(a =>
        /^(javascript|data):/.test(a.getAttribute('href'))
      )
    ).toBe(false);
    expect(
      [...doc.querySelectorAll('script')].some(
        s => s.textContent === 'alert(1)'
      )
    ).toBe(false);
    expect(
      JSON.parse(
        doc.querySelector('script[type="application/ld+json"]').textContent
      ).name
    ).toBe(name);
  });

  it.each([
    '/admin',
    '/collections/shared/secret',
    '/tools/invalid',
    '/mcp-catalog/../../api/admin',
    '//evil.com',
    '/tools/%2fadmin',
  ])('never fetches arbitrary/private route %s', async path => {
    const fetcher = vi.fn();
    const page = await loadPublicPage(path, fetcher);
    expect(page.status).toBe(404);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('treats missing tools as 404 and upstream failures as temporary 503', async () => {
    expect(
      (
        await loadPublicPage(`/tools/${id}`, async () => {
          throw Object.assign(new Error(), { status: 404 });
        })
      ).status
    ).toBe(404);
    expect(
      (
        await loadPublicPage('/skills', async () => {
          throw new Error('timeout');
        })
      ).status
    ).toBe(503);
    expect(
      (await loadPublicPage('/tools', async () => ({ invalid: true }))).status
    ).toBe(503);
  });

  it('does not fabricate leaderboard results when no activity exists', async () => {
    const page = await loadPublicPage('/leaderboard', async () => ({
      data: [],
      metric: 'recordedViews',
    }));
    expect(page.content).toContain('warming up');
  });

  it('keeps the homepage usable when an optional discovery source fails', async () => {
    const page = await loadPublicPage('/', async path => {
      if (path === '/api/trending-repos') throw new Error('Source unavailable');
      return getJson(path);
    });
    expect(page.status).toBe(200);
    expect(page.content).toContain('Example Tool');
    expect(page.content).toContain('temporarily unavailable');
  });

  it('refuses to silently produce an empty page when the shell template changes', async () => {
    const page = await loadPublicPage('/tools', getJson);
    expect(() =>
      renderDocument('<html><head></head><body></body></html>', page)
    ).toThrow();
  });
});

function response() {
  return {
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
    end() {
      return this;
    },
  };
}
describe('public renderer HTTP boundary', () => {
  it.each([undefined, 'Writing'])('passes only public data and matching query state into React (%s)', async category => {
    const renderApp = vi.fn(async () => '<main>Shared React layout</main>');
    const handler = createPublicHandler({
      readTemplate: async () => template,
      fetchImpl: async () => ({ ok: true, json: async () => ({ data: [tool] }) }),
      renderApp,
    });
    const res = response();
    await handler({ method: 'GET', query: { pagePath: '/tools', category, private: 'ignore-me' }, headers: { cookie: 'private-cookie' } }, res);
    expect(renderApp).toHaveBeenCalledWith(category ? '/tools?category=Writing' : '/tools', { '/api/ai-tools?limit=1000': { data: [tool] } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('data-rendered="react"');
    expect(res.body).toContain('href="https://collectiveai.tools/tools"');
    expect(res.body).not.toContain('private-cookie');
    expect(res.body).not.toContain('ignore-me');
  });
  it('returns an uncached 503 if React rendering fails', async () => {
    const handler = createPublicHandler({
      readTemplate: async () => template,
      renderApp: async () => { throw new Error('Render failed'); },
    });
    const res = response();
    await handler({ method: 'GET', query: { pagePath: '/prompt-studio' } }, res);
    expect(res.statusCode).toBe(503);
    expect(res.headers['Cache-Control']).toBe('no-store');
    expect(res.body).not.toContain('Render failed');
  });
  it('uses only the configured API origin, never forwards user credentials, and caches public HTML', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: [tool] }),
    }));
    const handler = createPublicHandler({
      readTemplate: async () => template,
      fetchImpl,
    });
    const res = response();
    await handler(
      {
        method: 'GET',
        query: { pagePath: '/tools' },
        headers: {
          cookie: 'private',
          authorization: 'secret',
          host: 'evil.com',
        },
      },
      res
    );
    expect(res.statusCode).toBe(200);
    expect(res.headers['Cache-Control']).toContain('s-maxage=');
    expect(fetchImpl.mock.calls[0][0]).toMatch(
      /^https:\/\/app.collectiveai.tools\/api\/ai-tools\?/
    );
    expect(fetchImpl.mock.calls[0][1].headers).toEqual({
      Accept: 'application/json',
    });
    expect(res.body).not.toContain('evil.com');
  });
  it('does not cache upstream failures and refuses mutations', async () => {
    const handler = createPublicHandler({
      readTemplate: async () => template,
      fetchImpl: async () => ({ ok: false, status: 429 }),
    });
    const res = response();
    await handler({ method: 'GET', query: { pagePath: '/tools' } }, res);
    expect(res.statusCode).toBe(503);
    expect(res.headers['Cache-Control']).toBe('no-store');
    const denied = response();
    await handler({ method: 'POST', query: { pagePath: '/tools' } }, denied);
    expect(denied.statusCode).toBe(405);
  });
  it('supports HEAD, rejects invalid route parameters, and safely handles missing build assets', async () => {
    const handler = createPublicHandler({ readTemplate: async () => template });
    const head = response();
    await handler(
      { method: 'HEAD', query: { pagePath: '/prompt-studio' } },
      head
    );
    expect(head.statusCode).toBe(200);
    expect(head.body).toBeUndefined();
    const invalid = response();
    await handler(
      { method: 'GET', query: { pagePath: ['/tools', '/admin'] } },
      invalid
    );
    expect(invalid.statusCode).toBe(404);
    const missing = response();
    await createPublicHandler({
      readTemplate: async () => {
        throw new Error('Missing template');
      },
    })({ method: 'GET', query: { pagePath: '/prompt-studio' } }, missing);
    expect(missing.statusCode).toBe(503);
    expect(missing.headers['Cache-Control']).toBe('no-store');
  });
});

describe('deployment crawl configuration', () => {
  it('allows public rendering data but keeps sensitive APIs disallowed', () => {
    const rules = readFileSync('public/robots.txt', 'utf8');
    expect(rules).toContain('Disallow: /api/');
    for (const endpoint of [
      'ai-tools',
      'mcp',
      'prompts',
      'skills',
      'trending-repos',
      'filters',
    ])
      expect(rules).toContain(`Allow: /api/${endpoint}$`);
    expect(rules).not.toContain('Allow: /api/auth');
    expect(rules).not.toContain('Allow: /api/admin');
    expect(rules).not.toContain('Allow: /api/favorites');
  });
  it('routes public pages through rendering without changing obsolete routes', () => {
    const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
    expect(config.rewrites.find(r => r.source === '/').destination).toContain(
      '/api/render-public'
    );
    expect(
      config.rewrites.find(r => r.source === '/tools/:id').destination
    ).toContain('/api/render-public');
    expect(config.rewrites.at(-1).destination).toBe('/app-shell.html');
    expect(config.functions['api/render-public.mjs'].includeFiles).toBe(
      '{dist/app-shell.html,ssr-build/**/*.js}'
    );
  });
});
