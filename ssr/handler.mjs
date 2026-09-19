import { loadPublicPage, renderDocument } from './public-pages.mjs';

export function createPublicHandler({
  readTemplate,
  fetchImpl = globalThis.fetch,
  apiOrigin = 'https://app.collectiveai.tools',
}) {
  return async function handler(req, res) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.setHeader('Allow', 'GET, HEAD');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(405).send('Method not allowed');
    }
    const path =
      typeof req.query?.pagePath === 'string' ? req.query.pagePath : '';
    const getJson = async endpoint => {
      // Endpoints are constructed by loadPublicPage, never taken from request URLs.
      // Do not forward cookies, Authorization, Host, or other visitor headers.
      const response = await fetchImpl(new URL(endpoint, apiOrigin).href, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
        redirect: 'error',
      });
      if (!response.ok)
        throw Object.assign(new Error('Public API unavailable'), {
          status: response.status,
        });
      return response.json();
    };
    try {
      const [template, page] = await Promise.all([
        readTemplate(),
        loadPublicPage(path, getJson),
      ]);
      res.setHeader(
        'Cache-Control',
        page.status === 200
          ? 'public, max-age=0, s-maxage=300, stale-while-revalidate=600'
          : 'no-store'
      );
      if (page.status === 503) res.setHeader('Retry-After', '60');
      res.status(page.status);
      return req.method === 'HEAD'
        ? res.end()
        : res.send(renderDocument(template, page));
    } catch {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Retry-After', '60');
      return res
        .status(503)
        .send('Temporarily unavailable. Please try again shortly.');
    }
  };
}
