// Run against a local Vite instance started with VITE_USE_REAL_API=true.
// Every API request is intercepted; no production reads or writes are made.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.LEADERBOARD_TEST_URL || 'http://127.0.0.1:5187';
assert(
  ['127.0.0.1', 'localhost'].includes(new URL(base).hostname),
  'Local preview only'
);
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : {}),
});
const tools = [
  {
    _id: '000000000000000000000001',
    name: 'Research Assistant',
    rank: 1,
    recordedViews: 42,
  },
  {
    _id: '000000000000000000000002',
    name: 'Writing Assistant',
    rank: 1,
    recordedViews: 42,
  },
  {
    _id: '000000000000000000000003',
    name: 'Code Assistant',
    rank: 3,
    recordedViews: 12,
  },
].map(tool => ({
  ...tool,
  description: 'A synthetic tool for local leaderboard testing.',
  categories: [{ _id: 'category', name: 'Productivity' }],
  pricing: [],
  tags: [],
  url: 'https://example.com',
  views: 5000,
}));
try {
  for (const width of [375, 768, 1440]) {
    for (const theme of ['light', 'dark']) {
      let mode = 'ranked';
      const errors = [];
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        serviceWorkers: 'block',
      });
      await context.addInitScript(
        value => localStorage.setItem('theme', value),
        theme
      );
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== base) return route.abort();
        if (!url.pathname.startsWith('/api/')) return route.continue();
        let body = {};
        if (url.pathname === '/api/ai-tools/leaderboard') {
          if (mode === 'error')
            return route.fulfill({
              status: 503,
              json: { error: 'Test failure' },
            });
          body = {
            metric: 'recordedViews',
            limit: 50,
            data: mode === 'empty' ? [] : tools,
          };
        } else if (url.pathname.startsWith('/api/ai-tools/'))
          body = { data: tools[0], related: [] };
        else if (url.pathname.startsWith('/api/reviews/'))
          body = { reviews: [], count: 0, average: null, totalPages: 0 };
        else if (url.pathname === '/api/analytics/view') body = { views: 5001 };
        else if (url.pathname.startsWith('/api/auth/'))
          return route.fulfill({ status: 401, json: { error: 'Guest' } });
        return route.fulfill({ json: body });
      });
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${base}/leaderboard`);
      await page.getByRole('list', { name: 'Most viewed tools' }).waitFor();
      assert.equal(
        await page
          .getByRole('listitem')
          .filter({ has: page.locator('a[href^="/tools/"]') })
          .count(),
        3
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth
        ),
        true,
        'Horizontal overflow'
      );
      assert.equal(
        await page.locator('body').getAttribute('data-theme'),
        theme
      );
      await page.screenshot({
        path: `/tmp/leaderboard-${width}-${theme}.png`,
        fullPage: true,
      });
      await page.getByRole('link', { name: /Research Assistant/ }).click();
      await page.waitForURL(`${base}/tools/${tools[0]._id}`);
      await page
        .getByRole('heading', { name: 'Research Assistant', exact: true, level: 1 })
        .waitFor();
      await page.getByRole('button', { name: 'Open menu' }).click();
      await page.getByRole('link', { name: /Leaderboard/ }).click();
      await page.getByRole('list', { name: 'Most viewed tools' }).waitFor();
      mode = 'error';
      await page.reload();
      await page.getByRole('alert').waitFor();
      mode = 'empty';
      await page.getByRole('button', { name: 'Try again' }).click();
      await page
        .getByRole('heading', { name: 'The leaderboard is warming up' })
        .waitFor();
      assert.equal(
        await page
          .getByRole('link', { name: 'Explore tools' })
          .getAttribute('href'),
        '/tools'
      );
      assert.deepEqual(errors, []);
      console.log(
        `PASS ${width}px ${theme}: rankings, detail link, menu navigation, error/retry, empty state, no overflow or runtime errors`
      );
      await context.close();
    }
  }
} finally {
  await browser.close();
}
