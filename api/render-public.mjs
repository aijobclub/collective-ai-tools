import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createPublicHandler } from '../ssr/handler.mjs';
import { renderApp } from '../ssr-build/entry-server.js';

export default createPublicHandler({
  renderApp,
  readTemplate: () =>
    readFile(join(process.cwd(), 'dist/app-shell.html'), 'utf8'),
});
