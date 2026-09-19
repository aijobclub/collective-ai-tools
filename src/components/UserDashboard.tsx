import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import SavedFavorites from './SavedFavorites';
import SEO from './SEO';

type Status = 'pending' | 'approved' | 'rejected';
type DashboardData = {
  summary: Record<Status | 'total', number>;
  pagination: { page: number; pages: number; total: number; limit: number };
  submissions: {
    id: string;
    name: string;
    type: 'tool' | 'mcp' | 'client';
    status: Status;
    submittedAt: string;
    linkState: 'linked' | 'unlinked' | 'unavailable';
    listing: null | {
      id: string;
      name: string;
      path: string;
      views: number;
      websiteClicks: number;
      reviewCount: number;
      averageRating: number | null;
    };
  }[];
};
const control =
  'rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700';
const names = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
};
const types = { tool: 'AI tool', mcp: 'MCP server', client: 'MCP client' };

export default function UserDashboard() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading)
    return (
      <p role='status' className='p-8 text-gray-600 dark:text-gray-300'>
        Loading your account…
      </p>
    );
  if (!user)
    return <Navigate to='/login' replace state={{ from: location.pathname }} />;
  return (
    <DashboardSession key={user.id} accountId={user.id} name={user.name} />
  );
}

function DashboardSession({
  accountId,
  name,
}: {
  accountId: string;
  name: string;
}) {
  const [tab, setTab] = useState<'submissions' | 'apps' | 'collections'>(
    'submissions'
  );
  const [status, setStatus] = useState<Status | ''>('');
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const filter = tab === 'apps' ? 'approved' : status;
  return (
    <section className='mx-auto max-w-6xl space-y-7 px-4 py-12 sm:px-6'>
      <SEO
        title='My dashboard | Collective AI Tools'
        description='Manage your submissions, listing engagement, and saved collections.'
        noindex
        aiFriendly={false}
      />
      <header className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <p className='text-sm text-gray-600 dark:text-gray-400'>
            Welcome, {name}
          </p>
          <h1 className='mt-2 text-3xl font-bold text-gray-900 dark:text-white'>
            My dashboard
          </h1>
          <p className='mt-2 text-gray-600 dark:text-gray-400'>
            Your submissions, published listings, and saved collections.
          </p>
        </div>
        <Link
          to='/submit'
          className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700'
        >
          Submit a tool
        </Link>
      </header>
      <nav aria-label='Dashboard sections' className='flex flex-wrap gap-2'>
        {(['submissions', 'apps', 'collections'] as const).map(value => (
          <button
            key={value}
            aria-pressed={tab === value}
            className={`${control} aria-pressed:border-blue-500 aria-pressed:text-blue-600 dark:aria-pressed:text-blue-300`}
            onClick={() => {
              setTab(value);
              setPage(1);
            }}
          >
            My {value}
          </button>
        ))}
      </nav>
      {tab === 'collections' ? (
        <SavedFavorites />
      ) : (
        <>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            {tab === 'submissions' ? (
              <label className='flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300'>
                Submission status
                <select
                  value={status}
                  className={control}
                  onChange={event => {
                    setStatus(event.target.value as Status | '');
                    setPage(1);
                  }}
                >
                  <option value=''>All statuses</option>
                  <option value='pending'>Pending review</option>
                  <option value='approved'>Approved</option>
                  <option value='rejected'>Rejected</option>
                </select>
              </label>
            ) : (
              <p className='text-sm text-gray-600 dark:text-gray-400'>
                Listings published from your approved submissions.
              </p>
            )}
            <button
              className={control}
              onClick={() => setAttempt(value => value + 1)}
            >
              Refresh dashboard
            </button>
          </div>
          <DashboardResults
            key={`${accountId}:${tab}:${filter}:${page}:${attempt}`}
            accountId={accountId}
            page={page}
            filter={filter}
            onPage={setPage}
            onRetry={() => setAttempt(value => value + 1)}
            apps={tab === 'apps'}
          />
        </>
      )}
    </section>
  );
}

function DashboardResults({
  accountId,
  page,
  filter,
  onPage,
  onRetry,
  apps,
}: {
  accountId: string;
  page: number;
  filter: string;
  onPage: (page: number) => void;
  onRetry: () => void;
  apps: boolean;
}) {
  const [data, setData] = useState<DashboardData>();
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ page: String(page), limit: '10' });
    if (filter) query.set('status', filter);
    async function load() {
      try {
        const response = await fetch(`/api/submissions?${query}`, {
          signal: controller.signal,
          cache: 'no-store',
          headers: { 'X-Dashboard-Account': accountId },
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(
            typeof result.error === 'string'
              ? result.error
              : 'Could not load your dashboard. Please try again.'
          );
        if (!controller.signal.aborted) setData(result);
      } catch (err) {
        if (!controller.signal.aborted)
          setError(
            err instanceof Error
              ? err.message
              : 'Could not load your dashboard.'
          );
      }
    }
    void load();
    return () => controller.abort();
  }, [accountId, page, filter]);
  if (error)
    return (
      <div
        role='alert'
        className='space-y-3 rounded-xl border border-red-300 p-5 text-red-700 dark:text-red-300'
      >
        <p>{error}</p>
        <button className={control} onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  if (!data)
    return (
      <p role='status' className='text-gray-600 dark:text-gray-300'>
        Loading your submissions…
      </p>
    );
  return (
    <div className='space-y-6'>
      <dl
        aria-label='Submission overview'
        className='grid grid-cols-2 gap-3 sm:grid-cols-4'
      >
        {(['total', 'pending', 'approved', 'rejected'] as const).map(key => (
          <div
            key={key}
            className='rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800'
          >
            <dt className='text-sm text-gray-600 dark:text-gray-400'>
              {key === 'total' ? 'Total submissions' : names[key]}
            </dt>
            <dd className='mt-2 text-2xl font-bold text-gray-900 dark:text-white'>
              {data.summary[key]}
            </dd>
          </div>
        ))}
      </dl>
      <div className='rounded-xl bg-blue-50 p-4 text-sm leading-relaxed text-gray-700 dark:bg-blue-950/40 dark:text-gray-300'>
        Performance measures engagement on this directory, not app usage,
        signups, or revenue. Views are recorded totals, not unique visitors.
        Outbound clicks cover tracked website/source links from this update
        onward; older clicks are not backfilled. Rapid repeat clicks are
        suppressed.
      </div>
      {!data.submissions.length ? (
        <div className='rounded-xl border border-gray-200 p-6 text-gray-600 dark:border-gray-700 dark:text-gray-400'>
          <p>
            {apps
              ? 'No approved apps yet.'
              : filter
                ? 'No submissions with this status.'
                : 'You haven’t submitted any tools yet.'}
          </p>
          <Link
            to='/submit'
            className='mt-3 inline-block text-blue-600 underline dark:text-blue-400'
          >
            Submit your first tool
          </Link>
        </div>
      ) : (
        <div className='space-y-4'>
          {data.submissions.map(submission => (
            <article
              key={submission.id}
              className='space-y-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800'
            >
              <header className='flex flex-wrap items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <p className='text-xs text-gray-600 dark:text-gray-400'>
                    {types[submission.type]} · Submitted{' '}
                    {new Date(submission.submittedAt).toLocaleDateString()}
                  </p>
                  <h2 className='mt-1 break-words text-xl font-semibold text-gray-900 dark:text-white'>
                    {submission.listing?.name || submission.name}
                  </h2>
                </div>
                <span className='rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200'>
                  {names[submission.status]}
                </span>
              </header>
              {submission.listing ? (
                <>
                  <dl className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
                    <div>
                      <dt className='text-sm text-gray-600 dark:text-gray-400'>
                        Listing views
                      </dt>
                      <dd className='mt-1 text-xl font-semibold text-gray-900 dark:text-white'>
                        {submission.type === 'client' ? 'Not tracked' : submission.listing.views.toLocaleString()}
                      </dd>
                    </div>
                    <div>
                      <dt className='text-sm text-gray-600 dark:text-gray-400'>
                        Outbound clicks
                      </dt>
                      <dd className='mt-1 text-xl font-semibold text-gray-900 dark:text-white'>
                        {submission.listing.websiteClicks.toLocaleString()}
                      </dd>
                    </div>
                    <div>
                      <dt className='text-sm text-gray-600 dark:text-gray-400'>
                        Reviews
                      </dt>
                      <dd className='mt-1 text-xl font-semibold text-gray-900 dark:text-white'>
                        {submission.listing.reviewCount.toLocaleString()}
                      </dd>
                    </div>
                    <div>
                      <dt className='text-sm text-gray-600 dark:text-gray-400'>
                        Average rating
                      </dt>
                      <dd className='mt-1 text-xl font-semibold text-gray-900 dark:text-white'>
                        {submission.listing.averageRating === null
                          ? 'Not rated'
                          : `${submission.listing.averageRating.toFixed(1)} / 5`}
                      </dd>
                    </div>
                  </dl>
                  <Link
                    to={submission.listing.path}
                    className='inline-block text-sm font-medium text-blue-600 underline dark:text-blue-400'
                  >
                    View listing
                  </Link>
                </>
              ) : (
                <p className='text-sm text-gray-600 dark:text-gray-400'>
                  {submission.status === 'pending'
                    ? 'Your submission is awaiting moderator review.'
                    : submission.status === 'rejected'
                      ? 'This submission was not approved. You can submit an updated listing for review.'
                      : submission.linkState === 'unavailable'
                        ? 'The linked listing is no longer available. Metrics cannot be shown.'
                        : 'This approval has no verified listing link, as with older approvals. Its performance data is unavailable.'}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
      <nav
        aria-label='Submission pages'
        className='flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-300'
      >
        <p>
          {data.pagination.total} matching submissions · Page {page} of{' '}
          {Math.max(1, data.pagination.pages)}
        </p>
        <div className='flex gap-2'>
          <button
            className={control}
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          >
            Previous page
          </button>
          <button
            className={control}
            disabled={page >= data.pagination.pages}
            onClick={() => onPage(page + 1)}
          >
            Next page
          </button>
        </div>
      </nav>
    </div>
  );
}
