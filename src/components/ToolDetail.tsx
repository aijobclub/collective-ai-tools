import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Heart } from 'lucide-react';
import type { AITool } from '@/lib/api';
import { captureEvent } from '@/lib/analytics';
import { recordResourceClick } from '@/lib/engagement';
import {
  cleanToolDescription,
  recordToolView,
  toolPath,
  toolWebsite,
} from '@/lib/toolDetails';
import { useFavorites } from '@/hooks/useFavorites';
import SEO from './SEO';
import ReviewSection from './ReviewSection';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

function DetailList({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <section className='space-y-3'>
      <h2 className='text-xl font-semibold'>{title}</h2>
      <ul className='list-disc space-y-2 pl-5 text-gray-600 dark:text-gray-300'>
        {items.map((item, index) => (
          <li key={index} className='whitespace-pre-wrap break-words'>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function LoadedTool({ tool, related }: { tool: AITool; related: AITool[] }) {
  const { isFavorite, toggleFavorite, canSave } = useFavorites('tool');
  const [views, setViews] = useState(tool.views ?? 0);
  useEffect(() => {
    let active = true;
    recordToolView(tool._id).then(count => {
      if (active && count !== undefined) setViews(count);
    });
    return () => {
      active = false;
    };
  }, [tool._id]);
  const website = toolWebsite(tool.website || tool.url);
  const description = cleanToolDescription(tool.description);
  const pricingUrl = toolWebsite(tool.pricingUrl);
  const hasDetails = Boolean(
    tool.useCases?.length ||
    tool.limitations?.length ||
    tool.examples?.length ||
    tool.alternatives?.length ||
    tool.pricingDetails
  );
  const pageUrl = `https://collectiveai.tools${toolPath(tool._id)}`;

  return (
    <>
      <SEO
        title={`${tool.name}: Details & Reviews | Collective AI Tools`}
        description={description.slice(0, 160)}
        url={pageUrl}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: tool.name,
          description,
          url: pageUrl,
          applicationCategory: tool.categories?.map(c => c.name).join(', '),
        }}
      />
      <header className='space-y-5 border-b border-gray-200 pb-8 dark:border-gray-700'>
        <div className='flex flex-wrap gap-2'>
          {tool.categories?.map(c => (
            <Badge key={c._id} variant='secondary'>
              {c.name}
            </Badge>
          ))}
        </div>
        <h1 className='break-words text-4xl font-bold tracking-tight sm:text-5xl'>
          {tool.name}
        </h1>
        <p className='max-w-3xl whitespace-pre-wrap break-words text-lg leading-relaxed text-gray-600 dark:text-gray-300'>
          {description}
        </p>
        <div className='flex flex-wrap items-center gap-3'>
          {website && (
            <Button asChild>
              <a
                href={website}
                target='_blank'
                rel='noopener noreferrer'
                onClick={() => {
                  void recordResourceClick(tool._id, 'tool');
                  void captureEvent('tool_click', {
                    id: tool._id,
                    name: tool.name,
                    url: tool.url,
                    source: 'tool_detail',
                  });
                }}
              >
                Visit website <ExternalLink className='ml-2 h-4 w-4' />
              </a>
            </Button>
          )}
          <Button
            variant='outline'
            disabled={!canSave}
            onClick={() => toggleFavorite(tool.name)}
            aria-pressed={isFavorite(tool.name)}
          >
            <Heart
              className={`mr-2 h-4 w-4 ${isFavorite(tool.name) ? 'fill-current' : ''}`}
            />
            {isFavorite(tool.name) ? 'Saved' : 'Save tool'}
          </Button>
          <a
            href='#tool-reviews'
            className='text-sm text-blue-600 dark:text-blue-400 hover:underline'
          >
            Read reviews
          </a>
          <span
            className='text-sm text-gray-600 dark:text-gray-400'
            title='Recorded visits, with repeat visits limited. This is not a unique-user count.'
          >
            {views.toLocaleString()} {views === 1 ? 'view' : 'views'}
          </span>
        </div>
        {!!tool.tags?.length && (
          <div className='flex flex-wrap gap-2'>
            {tool.tags.map(tag => (
              <Badge key={tag} variant='outline'>
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </header>
      <div className='grid gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_280px]'>
        <div className='min-w-0 space-y-8'>
          {hasDetails && (
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              Listing details are supplied by contributors and reviewed for
              publication. They are not an independent product test.
            </p>
          )}
          <DetailList title='Ideal use cases' items={tool.useCases} />
          <DetailList title='Limitations' items={tool.limitations} />
          <DetailList title='Examples' items={tool.examples} />
          {!!tool.alternatives?.length && (
            <section className='space-y-3'>
              <h2 className='text-xl font-semibold'>Suggested alternatives</h2>
              <p className='text-sm text-gray-600 dark:text-gray-400'>
                Contributor suggestions. Explore the directory to compare
                suitability.
              </p>
              <ul className='space-y-2'>
                {tool.alternatives.map((name, index) => (
                  <li key={index}>
                    <Link
                      to={`/?q=${encodeURIComponent(name)}`}
                      className='text-blue-600 hover:underline dark:text-blue-400'
                    >
                      {name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section id='tool-reviews' className='scroll-mt-24'>
            <ReviewSection targetId={tool._id} targetType='tool' />
          </section>
        </div>
        <aside className='space-y-6'>
          <section className='space-y-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800'>
            <h2 className='text-lg font-semibold'>Pricing</h2>
            <div className='flex flex-wrap gap-2'>
              {tool.pricing?.length ? (
                tool.pricing.map(p => (
                  <Badge key={p._id} variant='outline'>
                    {p.name}
                  </Badge>
                ))
              ) : (
                <p className='text-sm text-gray-600 dark:text-gray-400'>
                  Pricing not provided.
                </p>
              )}
            </div>
            {tool.pricingDetails && (
              <p className='whitespace-pre-wrap break-words text-sm'>
                {tool.pricingDetails}
              </p>
            )}
            <p className='text-sm leading-relaxed text-gray-600 dark:text-gray-400'>
              {tool.pricingCheckedAt && pricingUrl
                ? `Pricing checked by contributor on ${tool.pricingCheckedAt}.`
                : 'No pricing verification date provided.'}{' '}
              Check the provider for current plans.
            </p>
            {(pricingUrl || website) && (
              <a
                href={pricingUrl || website}
                target='_blank'
                rel='noopener noreferrer'
                className='inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline'
              >
                {pricingUrl ? 'Pricing source' : 'Check provider website'}{' '}
                <ExternalLink className='h-3 w-3' />
              </a>
            )}
          </section>
        </aside>
      </div>
      {!!related.length && (
        <section
          aria-labelledby='related-tools-heading'
          className='space-y-4 border-t border-gray-200 pt-8 dark:border-gray-700'
        >
          <div>
            <h2 id='related-tools-heading' className='text-xl font-semibold'>
              Related tools
            </h2>
            <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
              Tools in the same categories.
            </p>
          </div>
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            {related.map(item => (
              <Link
                key={item._id}
                to={toolPath(item._id)}
                className='block rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-blue-500 focus-visible:outline-2 focus-visible:outline-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-400'
              >
                <h3 className='font-semibold'>{item.name}</h3>
                <p className='mt-2 line-clamp-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400'>
                  {cleanToolDescription(item.description)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function ToolDetailContent({ id }: { id: string }) {
  const [result, setResult] = useState<{
    data: AITool;
    related: AITool[];
  } | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setError('');
      try {
        const response = await fetch(
          `/api/ai-tools/${encodeURIComponent(id)}`,
          { signal: controller.signal }
        );
        if (!response.ok)
          throw new Error(
            response.status === 404
              ? 'Tool not found'
              : 'Could not load this tool. Please try again.'
          );
        const data = await response.json();
        if (!controller.signal.aborted) setResult(data);
      } catch (err) {
        if (!controller.signal.aborted)
          setError(
            err instanceof Error ? err.message : 'Could not load this tool.'
          );
      }
    }
    void load();
    return () => controller.abort();
  }, [id, attempt]);
  if (error)
    return (
      <div className='space-y-4 py-12'>
        <SEO
          title={`${error === 'Tool not found' ? 'Tool not found' : 'Tool unavailable'} | Collective AI Tools`}
          url={`https://collectiveai.tools${toolPath(id)}`}
          noindex
        />
        <h1 className='text-2xl font-bold' role='alert'>
          {error}
        </h1>
        <Button onClick={() => setAttempt(value => value + 1)}>
          Try again
        </Button>
      </div>
    );
  if (!result)
    return (
      <p role='status' className='py-12'>
        Loading tool…
      </p>
    );
  return <LoadedTool tool={result.data} related={result.related} />;
}

export default function ToolDetail() {
  const { toolId = '' } = useParams();
  return (
    <div className='mx-auto max-w-6xl px-4 py-10 text-gray-900 sm:px-6 dark:text-white'>
      <Link
        to='/'
        className='mb-8 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400'
      >
        <ArrowLeft className='h-4 w-4' />
        Back to discovery
      </Link>
      <ToolDetailContent key={toolId} id={toolId} />
    </div>
  );
}
