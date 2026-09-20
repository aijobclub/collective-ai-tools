import { PassThrough } from 'node:stream';
import { renderToPipeableStream } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import App from './app';
import { AppProviders } from './AppProviders';
import type { PublicData } from './context/PublicDataContext';

export function renderApp(path: string, data: PublicData): Promise<string> {
  return new Promise((resolve, reject) => {
    const output = new PassThrough();
    let html = '';
    let error: unknown;
    output.on('data', chunk => {
      html += chunk.toString();
    });
    output.on('end', () => {
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(html);
    });
    output.on('error', reject);
    // Wait for lazy route modules before sending HTML; never send a spinner as
    // the server representation of a complete public page.
    const stream = renderToPipeableStream(
      <StaticRouter location={path}>
        <AppProviders snapshot={{ path: path.split('?')[0], data }}>
          <App />
        </AppProviders>
      </StaticRouter>,
      {
        onAllReady() {
          stream.pipe(output);
        },
        onShellError(cause) {
          clearTimeout(timer);
          reject(cause);
        },
        onError(cause) {
          error = cause;
        },
      }
    );
    const timer = setTimeout(() => {
      stream.abort();
      reject(new Error('React rendering timed out'));
    }, 5000);
  });
}
