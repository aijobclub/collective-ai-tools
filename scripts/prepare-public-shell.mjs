import { rename } from 'node:fs/promises';

// Vercel serves filesystem matches before rewrites. Leaving index.html in dist
// would bypass the public renderer on `/`. Preserve the SPA shell at a new path.
await rename(
  new URL('../dist/index.html', import.meta.url),
  new URL('../dist/app-shell.html', import.meta.url)
);
