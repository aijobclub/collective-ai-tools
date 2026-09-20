import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { createPublicHandler } from './handler.mjs';
import { isPublicPath } from './public-pages.mjs';
import { renderApp } from '../ssr-build/entry-server.js';

// Read-only local production preview. Never proxies credentials or mutations.
export function createPreviewServer({ fetchImpl = globalThis.fetch, dist = resolve('dist') } = {}) {
  const readTemplate = () => readFile(resolve(dist, 'app-shell.html'), 'utf8');
  const render = createPublicHandler({ readTemplate, fetchImpl, renderApp });
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const reply = {
        setHeader: (key, value) => res.setHeader(key, value),
        status(code) { res.statusCode = code; return reply; },
        send: body => res.end(body),
        end: () => res.end(),
      };
      if (isPublicPath(url.pathname)) return render({ method: req.method, query: { ...Object.fromEntries(url.searchParams), pagePath: url.pathname } }, reply);
      if (url.pathname.startsWith('/api/')) {
        const allowed = /^\/api\/(?:ai-tools(?:\/[a-zA-Z0-9-]+)?|mcp|prompts|skills|trending-repos|filters|stats|reviews\/[a-zA-Z0-9-]+)$/.test(url.pathname);
        if (!allowed || req.method !== 'GET') return reply.status(401).send(JSON.stringify({ error: 'Read-only public preview' }));
        const upstream = await fetchImpl(`https://app.collectiveai.tools${url.pathname}${url.search}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000), redirect: 'error' });
        res.setHeader('Content-Type', 'application/json');
        return reply.status(upstream.status).send(JSON.stringify(await upstream.json()));
      }
      const file = resolve(dist, `.${decodeURIComponent(url.pathname)}`);
      if (!file.startsWith(dist + '/')) return reply.status(404).send('Not found');
      try {
        const data = await readFile(file);
        res.setHeader('Content-Type', { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain' }[extname(file)] || 'application/octet-stream');
        return res.end(data);
      } catch {
        // Match the existing deployment's SPA fallback, including obsolete routes.
        if (req.headers.accept?.includes('text/html')) { res.setHeader('Content-Type', 'text/html'); return res.end(await readTemplate()); }
        return reply.status(404).send('Not found');
      }
    } catch { res.statusCode = 503; res.end('Temporarily unavailable'); }
  });
}
