import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createPublicHandler } from '../ssr/handler.mjs';

export default createPublicHandler({
  readTemplate: () =>
    readFile(join(process.cwd(), 'dist/app-shell.html'), 'utf8'),
});
