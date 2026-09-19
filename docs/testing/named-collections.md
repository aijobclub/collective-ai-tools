# Named collections and public sharing

Implemented locally; not deployed. This extends the earlier account-favorites increment.

## Usage and acceptance criteria

1. Open Saved with an empty search, enter a collection name, and select Create collection.
2. Under All saved, expand an item's Organize control to add it to one or more collections.
3. Select a collection to rename it, remove items, or delete it. None of these actions deletes the original favorites.
4. Guests keep private collections in browser storage. Open Saved after signing in to import them into the account. Failed imports retain browser data; conflicting versions are retained as a separately named browser copy.
5. Signed-in owners can explicitly enable public sharing. Anyone with the link can read that collection's name and items, but receives no owner ID, email, or other collections.
6. Revoke public link disables further reads. Re-enabling creates a different token. Deleting the collection or its owning account also prevents public reads. Already downloaded copies cannot be retracted.

Names are trimmed and limited to 80 characters. Collections accept up to 500 items as a payload-size safeguard. Membership uses existing favorite type/name keys; links search the directory because legacy favorites lack stable IDs. Public pages are marked noindex, APIs use no-store, and analytics events containing sharing paths are dropped.

## Test evidence

Tests were added before implementation: 10 API tests and 2 UI tests initially failed because the routes and collection controls were absent. All passed after implementation. Additional RED/GREEN checks caught guest import conflict data loss and analytics token exposure.

| Verification | Result |
| --- | --- |
| Frontend `npm test -- --run` | 185 tests passed |
| Frontend `npm run type-check` | Passed |
| Frontend `npm run build` | Passed; existing CSS/dependency warnings remain |
| Targeted ESLint for collection and analytics files | Passed |
| Backend `npm test -- --runInBand tests/collections.test.js tests/favorites.test.js` | 22 tests passed |
| Collection-store coverage | 98.29% lines, 88.63% branches, 94.44% functions |
| Collection API coverage | 97.77% lines, 86.11% branches, 100% functions |
| `git diff --check` in both repositories | Passed |

Store tests cover guest persistence, failed writes and retry, name validation, guest sharing refusal, acknowledged migration, conflicting migration copies, separate devices, account isolation, and aborted responses. API tests cover ownership, malformed input, concurrent membership changes, default privacy, public field allowlisting, revocation, link rotation, deleted owners, and deleting a collection without deleting favorites.

## Browser verification

Start frontend: `VITE_USE_REAL_API=true npm run dev -- --host 127.0.0.1 --port 4180`.
Then from backend: `node scripts/test-collections-browser.mjs`.

The browser script uses disposable MongoDB, real collection routes, and synthetic login fixtures. It does not connect to a production database. Verified guest creation and organization, login migration, public anonymous reading, live renaming after reload, revoke/re-enable, and deletion preserving favorites. No page errors or horizontal overflow at 375, 768, and 1440px. Screenshots were captured locally, including dark mode; mobile form width was improved following inspection.

No committed visual baseline exists, so visual regression is inconclusive. No full accessibility or production performance audit is claimed. The test login fixture is not a replacement for staging verification of the production authentication/proxy configuration. Existing repository-wide lint failures remain outside this increment. No deployment, commit, push, or production mutation was performed; earlier dirty-worktree changes were preserved.

## Self-evaluation

Overall 4.0/5. Accuracy 4: unit, API, and real-route browser checks pass; staging routing remains unverified. Completeness 4: named collections and revocable public sharing are present; stable-ID item links remain a legacy limitation. Clarity 4: public consent and revoke behavior are explicit; organization still requires opening Saved. Actionability 4: repeatable browser script and usage steps are included; both frontend and backend must be deployed together. Conciseness 4: persistence is centralized, but the collection management component could be split as future features grow.

Self-check: the assessment distinguishes verified local behavior from production claims. Next steps are a staging smoke test and, separately, stable-ID favorite migration. Neither blocks this local implementation handoff.
