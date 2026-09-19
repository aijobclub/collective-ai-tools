import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Trophy } from 'lucide-react';
import { cleanToolDescription, toolPath } from '@/lib/toolDetails';
import SEO from './SEO';
import { Button } from './ui/button';

interface RankedTool {
  _id: string;
  name: string;
  description: string;
  rank: number;
  recordedViews: number;
  categories?: { _id: string; name: string }[];
}
type Result =
  | { state: 'loading' }
  | { state: 'error' }
  | { state: 'ready'; tools: RankedTool[] };

function Rankings({ onRetry }: { onRetry: () => void }) {
  const [result, setResult] = useState<Result>({ state: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch('/api/ai-tools/leaderboard', {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Leaderboard unavailable');
        const body = await response.json();
        if (body.metric !== 'recordedViews' || !Array.isArray(body.data))
          throw new Error('Invalid leaderboard');
        if (!controller.signal.aborted)
          setResult({ state: 'ready', tools: body.data });
      } catch {
        if (!controller.signal.aborted) setResult({ state: 'error' });
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  if (result.state === 'loading')
    return (
      <p
        role='status'
        className='py-16 text-center text-gray-600 dark:text-gray-300'
      >
        Loading leaderboard…
      </p>
    );
  if (result.state === 'error')
    return (
      <div role='alert' className='py-10 text-center'>
        <p>Could not load the leaderboard. Please try again.</p>
        <Button variant='outline' className='mt-4' onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  if (!result.tools.length)
    return (
      <div className='rounded-2xl border border-dashed border-gray-300 px-6 py-16 text-center dark:border-gray-700'>
        <Trophy
          aria-hidden='true'
          className='mx-auto mb-4 h-9 w-9 text-blue-600 dark:text-blue-400'
        />
        <h2 className='text-xl font-semibold'>The leaderboard is warming up</h2>
        <p className='mx-auto mt-3 max-w-md text-gray-600 dark:text-gray-300'>
          Tools will appear as their pages receive views. We don’t fill the
          rankings with estimated or historical seeded counts.
        </p>
        <Button asChild className='mt-6'>
          <Link to='/tools'>Explore tools</Link>
        </Button>
      </div>
    );
  return (
    <ol
      aria-label='Most viewed tools'
      className='divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800'
    >
      {result.tools.map(tool => (
        <li key={tool._id}>
          <Link
            to={toolPath(tool._id)}
            className='group flex items-start gap-3 p-4 transition-colors hover:bg-gray-50 focus-visible:outline-offset-[-4px] focus-visible:outline-blue-500 sm:gap-6 sm:p-6 dark:hover:bg-gray-700/40'
          >
            <span
              className='w-8 shrink-0 pt-1 text-lg font-semibold tabular-nums text-gray-500 dark:text-gray-400'
              aria-label={`Rank ${tool.rank}`}
            >
              {tool.rank}
            </span>
            <div className='min-w-0 flex-1'>
              <div className='flex items-center gap-2'>
                <h2 className='min-w-0 break-words text-lg font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400'>
                  {tool.name}
                </h2>
                <ArrowUpRight
                  aria-hidden='true'
                  className='h-4 w-4 shrink-0 text-gray-400'
                />
              </div>
              <p className='mt-1 line-clamp-2 break-words text-sm leading-relaxed text-gray-600 dark:text-gray-300'>
                {cleanToolDescription(tool.description)}
              </p>
              {Boolean(tool.categories?.length) && (
                <p className='mt-2 break-words text-xs text-gray-500 dark:text-gray-400'>
                  {tool.categories?.map(category => category.name).join(' · ')}
                </p>
              )}
            </div>
            <div className='shrink-0 pt-1 text-right'>
              <p className='font-semibold tabular-nums'>
                {tool.recordedViews.toLocaleString('en-US')}
              </p>
              <p className='text-xs text-gray-500 dark:text-gray-400'>views</p>
            </div>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export default function Leaderboard() {
  const [attempt, setAttempt] = useState(0);
  return (
    <div className='mx-auto max-w-5xl px-4 py-10 text-gray-900 sm:px-6 sm:py-14 dark:text-white'>
      <SEO
        title='Most Viewed AI Tools | Collective AI Tools'
        description='Discover the AI tools getting attention on Collective AI, ranked by recorded tool-page views.'
        url='https://collectiveai.tools/leaderboard'
      />
      <Link
        to='/'
        className='inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 dark:text-gray-300'
      >
        <ArrowLeft aria-hidden='true' className='h-4 w-4' />
        Back to discovery
      </Link>
      <header className='mb-8 mt-8'>
        <p className='mb-3 text-sm font-semibold text-blue-600 dark:text-blue-400'>
          Tool leaderboard
        </p>
        <h1 className='text-3xl font-bold tracking-tight sm:text-5xl'>
          Most viewed tools
        </h1>
        <p className='mt-4 max-w-2xl text-gray-600 dark:text-gray-300'>
          See what’s getting attention on Collective AI. The top 50 tools,
          ranked by recorded visits to their tool pages.
        </p>
      </header>
      <section aria-label='Leaderboard rankings'>
        <Rankings
          key={attempt}
          onRetry={() => setAttempt(value => value + 1)}
        />
      </section>
      <aside className='mt-8 rounded-xl bg-gray-100 p-5 text-sm leading-relaxed text-gray-600 dark:bg-gray-800 dark:text-gray-300'>
        <h2 className='mb-2 font-semibold text-gray-900 dark:text-white'>
          How rankings work
        </h2>
        <p>
          These are cumulative page views since leaderboard tracking began, not
          unique visitors, weekly trends, or quality ratings. Older seeded
          counts are excluded. Equal counts share a rank.
        </p>
        <p className='mt-2'>
          Repeat requests from the same IP for the same tool are limited to one
          per 30 minutes per server instance. This reduces repeat counting but
          is not a guarantee against bots.
        </p>
      </aside>
    </div>
  );
}
