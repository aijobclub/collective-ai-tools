/** Best-effort analytics must never delay navigation to the provider. */
export async function recordResourceClick(
  id: string,
  type: 'tool' | 'mcp' | 'client'
): Promise<void> {
  if (!id) return;
  try {
    await fetch('/api/analytics/click', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, type }),
    });
  } catch {
    /* The external link still works when metrics are unavailable. */
  }
}

const pendingViews = new Map<string, Promise<void>>();
export function recordResourceView(id: string, type: 'mcp' | 'client'): Promise<void> {
  const key = `resource-view:${type}:${id}`;
  if (!id) return Promise.resolve();
  try {
    const last = sessionStorage.getItem(key);
    if (last && Date.now() - Number(last) < 30 * 60 * 1000) return Promise.resolve();
  } catch { /* Tracking also works without browser storage. */ }
  const pending = pendingViews.get(key);
  if (pending) return pending;
  const request = fetch('/api/analytics/view', {
    method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, type }),
  }).then(response => {
    if (response.ok || response.status === 429) {
      try { sessionStorage.setItem(key, String(Date.now())); } catch { /* Best effort. */ }
    }
  }).catch(() => {}).finally(() => pendingViews.delete(key));
  pendingViews.set(key, request);
  return request;
}
