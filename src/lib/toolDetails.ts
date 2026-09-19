import { withUtm } from './outbound';

export const toolPath = (id: string) => `/tools/${encodeURIComponent(id)}`;

/** Plain-text presentation for legacy descriptions imported from Markdown lists. */
export function cleanToolDescription(description: string): string {
  return description
    .replace(/\s+`+(?:#?(?:free|freemium|paid|opensource)|mium)?`*\s*$/i, '')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

export function toolWebsite(url?: string): string | undefined {
  try {
    const parsed = new URL(url || '');
    return ['http:', 'https:'].includes(parsed.protocol)
      ? withUtm(parsed.href)
      : undefined;
  } catch {
    return undefined;
  }
}

// Share the in-flight request across StrictMode mounts; storage survives refreshes.
const pendingViews = new Map<string, Promise<number | undefined>>();
export function recordToolView(id: string): Promise<number | undefined> {
  const key = `tool-view:${id}`;
  try {
    const last = sessionStorage.getItem(key);
    if (last && Date.now() - Number(last) < 30 * 60 * 1000)
      return Promise.resolve(undefined);
  } catch {
    /* Storage may be unavailable in private browsing. */
  }
  const pending = pendingViews.get(id);
  if (pending) return pending;
  const request = fetch('/api/analytics/view', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, type: 'tool' }),
  })
    .then(async response => {
      if (!response.ok && response.status !== 429) return undefined;
      try {
        sessionStorage.setItem(key, String(Date.now()));
      } catch {
        /* Best effort. */
      }
      if (!response.ok) return undefined;
      const result = await response.json();
      return typeof result.views === 'number' ? result.views : undefined;
    })
    .catch(() => undefined)
    .finally(() => pendingViews.delete(id));
  pendingViews.set(id, request);
  return request;
}
