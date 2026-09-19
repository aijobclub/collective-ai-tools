import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createPreviewServer } from '../ssr/local-preview.mjs';

const id = '695933dedece1dcb62245752';
const tool = { _id: id, name: 'Example Tool', description: 'A synthetic public tool used only for verification.', url: 'https://example.com', categories: [{ _id: 'category', name: 'Writing', slug: 'writing' }], pricing: [{ _id: 'free', name: 'Free', slug: 'free' }], tags: [], useCases: ['Draft a report'], limitations: ['Review generated text'], views: 0 };
const pagination = { total: 1, page: 1, limit: 20, totalPages: 1 };
const mockFetch = async url => {
  const path = new URL(url).pathname;
  let data;
  if (path === `/api/ai-tools/${id}`) data = { data: tool, related: [] };
  else if (path === '/api/ai-tools/leaderboard') data = { data: [], metric: 'recordedViews', limit: 50 };
  else if (path === '/api/ai-tools') data = { data: [tool], pagination };
  else if (path === '/api/mcp') data = { data: [{ _id: id, id: 'example-mcp', name: 'Example MCP', description: 'Read public documents', categories: [], tags: [], features: ['Read documents'], type: 'MCP Server' }], pagination };
  else if (path === '/api/prompts') data = { prompts: [{ _id: id, title: 'Example Prompt', content: 'Explain this code clearly', description: 'Explain code', tags: [], source: 'user', rating: 0, votes: [] }], total: 1, totalPages: 1 };
  else if (path === '/api/skills') data = { data: [{ id, name: 'Example Skill', description: 'Review code', category: 'coding', repo: 'https://example.com', tags: [], compatibleAgents: [] }], categories: [], agentPlatforms: [] };
  else if (path === '/api/trending-repos') data = { data: [{ title: 'Example Repo', description: 'A repository', link: 'https://example.com' }] };
  else if (path === '/api/filters') data = { categories: [], pricing: [], languages: [] };
  else if (path === '/api/stats') data = { aiTools: 1, mcpServers: 1, mcpClients: 0 };
  else if (path.startsWith('/api/reviews/')) data = { reviews: [], count: 0, average: null, totalPages: 0 };
  else throw new Error(`Unmocked request: ${path}`);
  return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
const server = createPreviewServer({ fetchImpl: mockFetch });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
try {
  assert(!(await readFile('dist/sw.js', 'utf8')).includes('index.html'), 'Service worker must not restore the SPA navigation shell');
  for (const javaScriptEnabled of [false, true]) {
    for (const width of [375, 1440]) {
      const context = await browser.newContext({ javaScriptEnabled, viewport: { width, height: 900 }, serviceWorkers: 'block' });
      await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
      const errors = [];
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      page.on('pageerror', error => errors.push(error.message));
      for (const path of ['/', '/tools', `/tools/${id}`, '/mcp-catalog', '/mcp-catalog/example-mcp', '/prompts', '/skills', '/trending', '/leaderboard', '/prompt-studio']) {
        const response = await page.goto(base + path);
        assert.equal(response.status(), 200);
        if (javaScriptEnabled) await page.locator('.public-ssr').waitFor({ state: 'detached' });
        else assert((await page.locator('main').textContent()).trim().length > 20);
        await page.waitForFunction(expected => document.querySelector('link[rel="canonical"]')?.getAttribute('href') === expected, `https://collectiveai.tools${path}`);
        assert.equal(await page.locator('link[rel="canonical"]').count(), 1);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `Overflow at ${path}`);
        if (path === `/tools/${id}`) {
          await page.getByRole('heading', { name: 'Example Tool', exact: true }).waitFor();
          assert((await page.locator('main').textContent()).includes('Draft a report'));
          await page.screenshot({ path: `/tmp/public-page-${width}-${javaScriptEnabled ? 'interactive' : 'no-js'}.png`, fullPage: true });
        }
      }
      if (javaScriptEnabled) {
        await page.goto(base);
        await page.locator('.public-ssr').waitFor({ state: 'detached' });
        await page.getByRole('link', { name: /Example Tool/ }).first().click();
        await page.waitForURL(`${base}/tools/${id}`);
        await page.getByRole('button', { name: 'Save tool' }).waitFor();
        await page.getByRole('button', { name: 'Save tool' }).click();
        await page.getByRole('button', { name: 'Saved', exact: true }).waitFor();
      }
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}px JS=${javaScriptEnabled}: 10 routes, content, canonicals, no overflow/runtime errors${javaScriptEnabled ? ', navigation and guest save' : ''}`);
      await context.close();
    }
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
