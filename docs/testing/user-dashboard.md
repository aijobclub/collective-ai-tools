# Personal dashboard

Implemented locally, not deployed. Open **My dashboard** from the signed-in navigation or visit `/dashboard`. The submission confirmation now links directly to it.

## Accepted scope

- AC-001: A signed-in user sees only their own submissions, with pending/approved/rejected status, filters, and pagination. Anonymous users are redirected to login; stale account headers and deleted accounts are rejected by the API.
- AC-002: New approvals persist a bidirectional submission/listing association. Retries and recovery after a partially completed approval do not create duplicate listings. Existing directory duplicates can still be accepted by moderators without assigning the listing to the new submitter.
- AC-003: My apps shows approved submissions, verified listing links, recorded views, outbound clicks, review count, and average rating. Missing linkage, removed listings, unrated listings, and untracked client views are shown explicitly rather than inventing data.
- AC-004: My collections reuses the existing favorites, named collections, and sharing interface.
- AC-005: Loading, error/retry, pagination, empty, and logout states work. Dashboard content is noindex, its API is no-store, and analytics payloads containing dashboard paths are dropped.

## Metric definitions and limitations

- Views: recorded tool/MCP-server detail-page visits, including previously stored totals. These are not unique visitors. Client detail views are displayed as **Not tracked** because clients currently link to their filtered catalog rather than a tracked detail page.
- Outbound clicks: new backend counters for tracked tool website and MCP website/source links. Counting begins with this deployment, with no historical PostHog backfill. A 30-minute IP/resource limiter suppresses rapid repeats. The limiter is in-memory per process, not a distributed unique-visitor service; bots, shared IPs, restarts, blockers, and network failures affect accuracy.
- Reviews: aggregate count and average from stored reviews for the specific linked resource and type. No ratings appear as **Not rated**.
- These are directory engagement metrics, not app usage, conversions, signups, or revenue. No date-range trends or conversion integrations are claimed.
- Older approved submissions have no trusted listing association. They remain visible but without metrics or an inferred link. No URL/name-based ownership backfill or admin ownership-claim/reconciliation UI was added.
- The dashboard establishes provenance from approved submissions, not independently verified ownership of an external business.

## Implementation

Backend GET `/api/submissions` is cookie-authenticated and scoped to the requesting user. It requires `X-Dashboard-Account` matching the session. Status filtering and 1–50 page-size validation are supported; only the current bounded page is enriched with resource and review aggregates. Every resource must point back to the same submission before its metrics are returned.

Submission records gain `publishedResource`; AI tools, MCP servers, and MCP clients gain a private, sparse unique `sourceSubmission` reference plus `websiteClicks` and `firstRecordedClickAt`. New approvals populate these references. No existing records were migrated or overwritten.

POST `/api/analytics/click` validates resource ID/type and increments only a known resource. Frontend tracking is best-effort and never blocks provider navigation. MCP detail views now use deduplicated tracking. Admin listing edits cannot reset the new counters or rewrite submission provenance through normal form fields.

## Verification evidence

Initial dashboard API tests failed at runtime because GET submission history/linkage/click counting did not exist. The initial UI test referenced the missing dashboard component and failed module resolution. Further RED/GREEN checks covered MCP view recording, analytics privacy, and explicit untracked-client labels. No checkpoint commits were made; earlier dirty-worktree changes were preserved.

- Full frontend suite: 201 tests pass across 28 files.
- Relevant backend suite: 63 tests pass across dashboard, submission approval, tool details, favorites, and collections.
- TypeScript check, production build, targeted dashboard/tracking lint, and diff whitespace checks pass. Existing repository-wide lint failures and build dependency/CSS warnings are outside this increment.
- Measured dashboard/tracking coverage before the final client-label assertion: 98.8% lines, 94.66% branches, 100% functions. Backend dashboard aggregation coverage: 96.96% lines, 91.11% branches, 100% functions.
- API tests include cross-account isolation, a deliberately incorrect stored resource link, deleted accounts/listings, legacy unlinked approvals, partial-approval recovery for all three resource types, real rating aggregates, bounded pagination, strict click validation, repeat suppression, and stale admin edits.

Browser reproduction:

1. Frontend: `VITE_USE_REAL_API=true npm run dev -- --host 127.0.0.1 --port 4180`.
2. Backend: `node scripts/test-dashboard-browser.mjs`.

The script uses disposable MongoDB, real submission/approval/listing/analytics APIs, and synthetic authentication fixtures. Verified: login redirect, actual submission form, pending status, moderator approval, public listing visit, outbound click, dashboard counts/rating, collections access, and logout redirect. No page errors or horizontal overflow at 375, 768, and 1440px. Screenshots were inspected locally, with dark-mode capture. No production database, account, or provider was touched.

No full accessibility audit, production performance benchmark, or committed-baseline visual regression is claimed. Production auth/proxy behavior still needs a staging check. Deploy frontend and backend together; verify creation of the new sparse unique provenance indexes. No deployment, commit, or push was performed.

## Self-evaluation

Overall 4.0/5. Accuracy 4: measured values, isolated API/browser tests, and explicit unavailable states; distributed click deduplication is not provided. Completeness 4: personal submissions, app metrics, and collections are delivered; older approvals need a separately authorized reconciliation workflow. Clarity 4: metric limits and status states are visible; the dashboard explanation can be shortened after user feedback. Actionability 4: navigation and repeatable tests are included; staging/deployment remain. Conciseness 4: one bounded aggregation endpoint serves both list views; the dashboard component can be split when its feature surface grows.

Self-check: this assessment distinguishes locally verified behavior from production readiness. Follow-ups: staging verification, then explicit admin-assisted historical ownership reconciliation if requested. No critical self-evaluation issue remains.
