# Account favorites verification

Historical report for the first increment. Named collections and sharing are now covered in [named-collections.md](named-collections.md).

Scope: authenticated favorites synchronization, guest migration, shared UI state,
and failure recovery. Named collections and public sharing are not implemented.
Existing display-name keys are retained for compatibility; renames do not migrate
automatically. Saved entries link to directory search because legacy keys lack IDs.

## Evidence

- `npm test -- --run`: 172 frontend tests pass.
- Backend `npm test -- --runInBand tests/favorites.test.js`: 12 tests pass against an isolated MongoDB.
- `npm run type-check`: pass.
- `npm run build`: pass; existing CSS/dependency warnings remain.
- `npx --no-install vitest run src/lib/favoritesStore.test.ts --coverage --coverage.include=src/lib/favoritesStore.ts`: 96.66% lines, 86.04% branches, 93.33% functions.
- Targeted lint: no errors in new favorites files. Repository-wide lint is not clean (17 errors in existing code at verification time).
- Local Chrome smoke test using intercepted API responses: 16 guest entries visible, login import clears acknowledged local entries, second browser context loads account favorites, remote deletion refreshes on focus, failure rolls back and Retry succeeds, no page errors or horizontal overflow at 375px.
- Visual regression is inconclusive: no committed visual baseline. No full accessibility or production performance audit was performed.

## Guarantees covered

`src/lib/favoritesStore.test.ts` checks guest compatibility, shared consumers,
blocked browser writes, add-only imports, failed imports, batching, rollback/retry,
remote refresh, account isolation, initial-read failures, and aborted responses.
Backend `tests/favorites.test.js` checks cookie authentication, user ownership,
cache restrictions, duplicate imports and concurrent saves, scoped deletion,
stale-account headers, deleted users, input validation, and all five content types.

Implementation preceded these regression tests; no test-first history is claimed.
A subsequently discovered guest Retry bug has genuine RED/GREEN evidence: the
retry assertion failed (1 of 10 tests), then passed after replaying the failed
save intent. No checkpoint commits were made because the worktrees include
earlier uncommitted changes that must remain preserved.

## Remaining verification

Frontend and backend must both be deployed for real account synchronization.
The browser check mocks transport; live deployed cookie/proxy behavior still
needs a staging smoke test. No production data, deployment, or remote git state
was changed. Account refresh happens on focus/visibility/storage events, not by
continuous background polling. Demo MSW favorites are in-memory only.

## Self-evaluation

Overall 4.0/5. Accuracy 4: unit, database integration, and browser tests pass,
but staging transport remains unverified. Completeness 4: sync/migration/retry
covered; broader named collections/sharing remain outside this increment.
Clarity 4: explicit sync and error states; name-based search links are less direct
than stable item links. Actionability 4: locally buildable and tested, deployment
still required. Conciseness 4: one shared store avoids duplicate persistence,
but its lifecycle deserves continued regression coverage.
Priority follow-up: staging cookie/proxy smoke test, then stable-ID migration
before extending favorites into shareable collections.
Self-check: this assessment separates verified local behavior from deployment claims.
