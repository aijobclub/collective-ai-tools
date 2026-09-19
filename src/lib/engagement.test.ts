import { beforeEach, expect, it, vi } from 'vitest';
import { recordResourceClick, recordResourceView } from './engagement';
beforeEach(() => { vi.mocked(fetch).mockReset(); });
it.each(['tool', 'mcp', 'client'] as const)('records %s outbound clicks without blocking navigation', async type => {
  vi.mocked(fetch).mockResolvedValue(Response.json({ success: true }));
  await recordResourceClick('resource-id', type);
  expect(fetch).toHaveBeenCalledWith('/api/analytics/click', expect.objectContaining({ method: 'POST', keepalive: true, body: JSON.stringify({ id: 'resource-id', type }) }));
});
it('does not break links when tracking fails or an ID is absent', async () => {
  vi.mocked(fetch).mockRejectedValue(new Error('offline'));
  await expect(recordResourceClick('resource-id', 'tool')).resolves.toBeUndefined();
  vi.mocked(fetch).mockClear();
  await recordResourceClick('', 'tool');
  expect(fetch).not.toHaveBeenCalled();
});
it('counts an MCP detail visit once across concurrent mounts and recent visits', async () => {
  vi.mocked(sessionStorage.getItem).mockReturnValue(null);
  vi.mocked(fetch).mockResolvedValue(Response.json({ views: 1 }));
  await Promise.all([recordResourceView('mcp-id', 'mcp'), recordResourceView('mcp-id', 'mcp')]);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith('/api/analytics/view', expect.objectContaining({ body: JSON.stringify({ id: 'mcp-id', type: 'mcp' }) }));
  vi.mocked(sessionStorage.getItem).mockReturnValue(String(Date.now()));
  await recordResourceView('mcp-id', 'mcp');
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('handles missing IDs, storage restrictions, rate limits and failed view requests', async () => {
  vi.mocked(sessionStorage.getItem).mockImplementation(() => { throw new Error('blocked'); });
  vi.mocked(sessionStorage.setItem).mockImplementation(() => { throw new Error('blocked'); });
  await recordResourceView('', 'mcp');
  expect(fetch).not.toHaveBeenCalled();
  vi.mocked(fetch).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(Response.json({}, { status: 429 }));
  await recordResourceView('retry-view', 'mcp');
  await recordResourceView('retry-view', 'mcp');
  expect(fetch).toHaveBeenCalledTimes(2);
});
