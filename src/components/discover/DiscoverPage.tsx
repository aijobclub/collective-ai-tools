import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Heart, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import SEO from '@/components/SEO';
import ErrorBoundary from '@/components/ErrorBoundary';
import { generateWebsiteStructuredData, generateBreadcrumbStructuredData } from '@/lib/seoUtils';
import { Input } from '@/components/ui/input';
import { DiscoverHero } from './DiscoverHero';
import { SearchResults } from './SearchResults';
import { DiscoverBrowse } from './DiscoverBrowse';
import SavedFavorites from '../SavedFavorites';

const POPULAR = ['agents', 'code review', 'rag', 'image generation', 'mcp'];

export default function DiscoverPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const [showFavorites, setShowFavorites] = useState(false);

  const setQuery = (value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set('q', value);
    else next.delete('q');
    setParams(next, { replace: true });
  };

  return (
    <ErrorBoundary>
      <SEO
        title="Discover AI Tools, MCP Servers, Prompts & Skills | Collective AI Tools"
        description="Search and browse the AI ecosystem: curated tools, MCP servers, prompts, skills, and trending repositories in one place."
        url="https://collectiveai.tools/"
        type="website"
        structuredData={[generateWebsiteStructuredData(), generateBreadcrumbStructuredData(['Discover'])]}
      />
      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 lg:px-8">
        <DiscoverHero />

        <div className="mt-7 max-w-2xl">
          <div className="relative flex items-center">
            <Search aria-hidden="true" className="pointer-events-none absolute left-4 z-10 h-5 w-5 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tools, MCP servers, prompts, skills, repos…"
              className="h-14 rounded-2xl border-black/10 bg-white/85 pl-12 pr-4 text-base text-gray-900 shadow-xs backdrop-blur-xl transition-shadow focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-white/10 dark:bg-white/4 dark:text-white"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <Link to='/leaderboard' className='inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'><Trophy aria-hidden='true' className='h-3.5 w-3.5' />Leaderboard</Link>
            <button
              onClick={() => setShowFavorites(!showFavorites)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-colors border",
                showFavorites 
                  ? "bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-700/50 dark:text-yellow-400" 
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
              )}
            >
              <Heart className={cn("w-3.5 h-3.5", showFavorites && "fill-current")} />
              Saved
            </button>
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1" />
            <span className="text-gray-400 dark:text-gray-500">Popular</span>
            {POPULAR.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuery(q)}
                className="rounded-full px-2.5 py-1 font-medium text-gray-600 transition-colors hover:bg-black/4 hover:text-blue-600 dark:text-gray-300 dark:hover:bg-white/6 dark:hover:text-blue-400"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8">
          {query.trim() ? <SearchResults query={query} showFavorites={showFavorites} /> : showFavorites ? <SavedFavorites /> : <DiscoverBrowse showFavorites={false} />}
        </div>
      </div>
    </ErrorBoundary>
  );
}
