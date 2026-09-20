# Public UI hydration — 2026-09-21

## Outcome and deployment

The initial public HTML now uses the existing React components, not a separate
directory layout. The browser hydrates the same tree using an escaped, public-only
data snapshot. No content is hidden to mask the transition. Canonicals and crawler
access remain intact. Theme selection runs before the page markup is parsed.

`npm run build` builds the browser app into `dist/` and the Node renderer into
`ssr-build/`, then prepares `dist/app-shell.html`. Vercel packages that shell and
all server JavaScript chunks. The server bundle is not exposed as a static asset.
Use `npm run preview` to run the production renderer locally. No new dependency or
backend change is required. No deployment, push, or commit was performed.

After deployment, inspect the homepage and a tool page with JavaScript disabled,
then with slow JavaScript: their layout should remain the same. Check a single
self-referencing canonical, navigation, saving, and function error rates. Actual
Vercel deployment behavior remains unverified locally. The prior public-HTML
cache policy and backend per-IP rate limits still apply. Error responses retain
their small 404/503 fallback; interactive-only content can load after hydration.

## TDD evidence

Journeys were derived from the user's report: see the original UI at first paint,
retain crawlable listing content, and gain interactivity without replacing that UI.

RED: `npm test -- --run src/ssr.test.tsx` first failed on the missing shared renderer;
after adding it, both tests failed because Navigation rendered an unsupported
portal on the server. The closed menu no longer creates that portal. GREEN:
the same tests passed with real discovery controls, data, and tool details.
Tests were then extended to all data-backed public routes, concurrent request
isolation, URL state, safe snapshot serialization, and HTTP rendering failures.
Checkpoint commits were not created; this report preserves the RED/GREEN evidence.

| Guarantee | Verification | Result |
| --- | --- | --- |
| Existing components render populated public HTML | `src/ssr.test.tsx` | Pass |
| Snapshots are escaped, request-local, and contain no forwarded credentials | `src/ssr.test.tsx`, `ssr/public-pages.test.js` | Pass |
| Canonicals remain correct; React failure returns uncached 503 | `ssr/public-pages.test.js` | Pass |
| Delayed JS retains original main and page-heading DOM nodes | `scripts/verify-public-pages.mjs` | Pass |
| Client navigation and guest saving still work | Same browser script, isolated fixtures | Pass |

Final checks:

- `npm test -- --run`: 249 tests, 32 files passed.
- `npm run type-check`: passed.
- `npm run build`: passed; existing CSS-selector warnings remain.
- `CHROME_PATH=/usr/bin/google-chrome node scripts/verify-public-pages.mjs`:
  78 route/query checks passed: 13 cases at 375/768/1440px, JS on/off,
  light/dark appearance, Asia/Kolkata timezone. No hydration errors or overflow.
  External traffic was blocked and all data was synthetic; no production writes.
- Focused coverage for `src/entry-server.tsx`, `src/context/PublicDataContext.tsx`,
  `src/AppProviders.tsx`, `ssr/handler.mjs`, and `ssr/public-pages.mjs`:
  97.68% lines, 90% branches, 92.3% functions. Stream timeout/shell-error callbacks
  are not directly unit-tested; handler-level rendering failure is covered.
- Targeted ESLint: five existing errors and four existing warnings remain in old
  components. Comparison with committed versions confirmed no new findings.
  New renderer/provider/context/test files pass lint. `git diff --check` passes.

Mobile light and desktop dark first-paint screenshots were visually inspected.
No committed visual baseline or full Core Web Vitals/accessibility audit was used;
do not interpret these checks as those broader guarantees.

## Self-evaluation

Overall 4.0/5. Accuracy 4: automated DOM-retention checks pass; production routing
still needs a smoke test. Completeness 4: public routes and query cases are covered;
stream timeout callbacks lack direct unit coverage. Clarity 4: the shared renderer
removes the competing UI, but the two-build deployment needs documentation.
Actionability 4: changes and reproduction commands are ready; deployment needs
separate authorization. Conciseness 4: the fix reuses the existing UI, though each
data-loading component needs initial-state wiring.

Top follow-ups: production smoke test, then direct stream-failure tests. No critical
self-review issue. Self-check: the user should agree because the reported layout
replacement is tested explicitly, not inferred from final screenshots alone.
