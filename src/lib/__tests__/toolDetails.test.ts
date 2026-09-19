import { beforeEach, expect, it, vi } from 'vitest';
import {
  cleanToolDescription,
  recordToolView,
  toolWebsite,
} from '../toolDetails';

it.each([
  ['No-code automation. ``', 'No-code automation.'],
  ['Calendar scheduling. `mium`', 'Calendar scheduling.'],
  ['A tool. `#freemium`', 'A tool.'],
  ['Uses `Python` for automation.', 'Uses Python for automation.'],
  ['Supports a free plan.', 'Supports a free plan.'],
])(
  'cleans legacy formatting without changing the description meaning',
  (input, expected) => {
    expect(cleanToolDescription(input)).toBe(expected);
  }
);

beforeEach(() => {
  vi.mocked(sessionStorage.getItem).mockReturnValue(null);
  vi.mocked(fetch).mockReset();
});

it('deduplicates concurrent view requests and records successful visits', async () => {
  vi.mocked(fetch).mockResolvedValue({
    ok: true,
    json: async () => ({ views: 5 }),
  } as Response);
  expect(
    await Promise.all([
      recordToolView('concurrent'),
      recordToolView('concurrent'),
    ])
  ).toEqual([5, 5]);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(sessionStorage.setItem).toHaveBeenCalledWith(
    'tool-view:concurrent',
    expect.any(String)
  );
});

it('skips a recently viewed tool after refresh', async () => {
  vi.mocked(sessionStorage.getItem).mockReturnValue(String(Date.now()));
  expect(await recordToolView('recent')).toBeUndefined();
  expect(fetch).not.toHaveBeenCalled();
});

it('allows a retry after a failed analytics request', async () => {
  vi.mocked(fetch)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue({
      ok: true,
      json: async () => ({ views: 1 }),
    } as Response);
  expect(await recordToolView('retry')).toBeUndefined();
  expect(await recordToolView('retry')).toBe(1);
});

it('only creates outbound links for HTTP and HTTPS URLs', () => {
  expect(toolWebsite('javascript:alert(1)')).toBeUndefined();
  expect(toolWebsite('data:text/html,test')).toBeUndefined();
  expect(toolWebsite('invalid')).toBeUndefined();
  expect(toolWebsite('https://example.com')).toContain(
    'utm_source=collectiveai.tools'
  );
});
