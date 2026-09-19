import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Heart } from 'lucide-react';
import { withUtm } from '@/lib/outbound';
import { captureEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { useFavorites } from '@/hooks/useFavorites';
import { TYPE_ACCENT } from './theme';
import type { DiscoverItem } from './types';

function monogram(title: string): string {
  const words = title.replace(/^[^a-z0-9]+/i, '').split(/[\s/_-]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return title.replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase() || '?';
}

export function DiscoverCard({ item, style }: { item: DiscoverItem; style?: CSSProperties }) {
  const accent = TYPE_ACCENT[item.type];
  const { isFavorite, toggleFavorite, canSave } = useFavorites(item.type);
  const favorited = isFavorite(item.title);

  const onClick = () =>
    captureEvent('discover_click', { type: item.type, id: item.id, title: item.title });

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(item.title);
  };

  const body = (
    <div
      className={cn(
        'group relative flex h-full flex-col gap-3.5 overflow-hidden rounded-2xl p-5',
        'border border-gray-200/60 dark:border-white/10',
        'bg-white dark:bg-white/5 backdrop-blur-xl',
        'shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none transition-all duration-300',
        'hover:-translate-y-1 hover:shadow-xl hover:border-transparent dark:hover:border-transparent',
        accent.glow,
        'after:absolute after:inset-0 after:pointer-events-none after:rounded-2xl after:ring-1 after:ring-inset after:ring-transparent after:transition-all hover:after:ring-2',
        accent.ring.replace('hover:border-', 'hover:after:ring-').replace('/40', '/50') // hack to convert border to ring for smoother animation
      )}
    >
      <div className="flex items-start gap-3.5">
        <div
          aria-hidden="true"
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br text-[15px] font-bold tracking-tight text-white shadow-sm border border-white/20 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-1',
            accent.bar,
          )}
        >
          {monogram(item.title)}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ring-1 ring-inset', accent.chip)}>
              {item.type}
            </span>
            <div className="flex items-center gap-1.5">
              {item.meta && (
                <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[11px] font-medium text-gray-600 dark:text-gray-300 ring-1 ring-inset ring-gray-200 dark:ring-gray-700">
                  {item.meta}
                </span>
              )}
              <button
                disabled={!canSave}
                onClick={handleFavoriteClick}
                className={cn(
                  "relative z-10 p-1.5 rounded-full transition-all duration-200 focus:outline-hidden",
                  favorited 
                    ? "bg-yellow-100 text-yellow-500 dark:bg-yellow-900/30" 
                    : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-500"
                )}
                aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart className={cn("w-4 h-4", favorited && "fill-current")} />
              </button>
            </div>
          </div>
          <h3 className="flex items-center gap-1.5 text-base font-bold text-gray-900 dark:text-white leading-tight pr-6">
            <span className="truncate">{item.title}</span>
            {item.verified && (
              <span className={cn('inline-flex shrink-0 items-center', accent.text)} title="Verified">
                <BadgeCheck aria-hidden="true" className="h-4 w-4" />
                <span className="sr-only">Verified</span>
              </span>
            )}
          </h3>
        </div>
      </div>
      <p className="line-clamp-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400 mt-1">
        {item.subtitle}
      </p>
      {item.tags.length > 0 && (
        <div className="mt-auto pt-2 flex flex-wrap gap-1.5">
          {item.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded-md bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-600 border border-gray-100 dark:border-white/5 dark:bg-white/5 dark:text-gray-300 transition-colors group-hover:border-gray-200 dark:group-hover:border-white/10"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  const wrapper = 'discover-in block h-full rounded-2xl focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500';

  if (item.external) {
    return (
      <a href={withUtm(item.href)} target="_blank" rel="noopener noreferrer" onClick={onClick} className={wrapper} style={style}>
        {body}
      </a>
    );
  }
  return (
    <Link to={item.href} onClick={onClick} className={wrapper} style={style}>
      {body}
    </Link>
  );
}
