import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';

interface Review {
  _id: string;
  user: { _id: string; name: string } | null;
  rating: number;
  comment: string;
  createdAt: string;
}
interface ReviewResponse {
  reviews: Review[];
  count: number;
  average: number | null;
  page: number;
  totalPages: number;
}
interface ReviewProps {
  targetId: string;
  targetType: 'mcp' | 'tool' | 'client';
}

function Reviews({ targetId, targetType }: ReviewProps) {
  const { user } = useAuth();
  const [result, setResult] = useState<ReviewResponse | null>(null);
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setLoadError('');
      try {
        const response = await fetch(
          `/api/reviews/${targetId}?type=${targetType}&page=${page}`,
          { signal: controller.signal }
        );
        if (!response.ok)
          throw new Error('Could not load reviews. Please try again.');
        const data = await response.json();
        if (!controller.signal.aborted) setResult(data);
      } catch (error) {
        if (!controller.signal.aborted)
          setLoadError(
            error instanceof Error ? error.message : 'Could not load reviews.'
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [targetId, targetType, page, refresh]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!rating || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    setSaved(false);
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId, targetType, rating, comment }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || 'Could not save your review. Please try again.'
        );
      }
      setSaved(true);
      setRating(0);
      setComment('');
      setPage(1);
      setRefresh(value => value + 1);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Could not save your review.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className='space-y-5'>
      <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>
        Reviews & ratings
      </h2>
      {result && !loadError && (
        <p className='text-sm text-gray-600 dark:text-gray-300'>
          {result.count
            ? `${result.average?.toFixed(1)} out of 5 · ${result.count} ${result.count === 1 ? 'review' : 'reviews'}`
            : 'No ratings yet'}
        </p>
      )}
      {user ? (
        <form
          onSubmit={submit}
          className='space-y-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800'
        >
          <fieldset disabled={submitting}>
            <legend className='mb-2 text-sm font-medium'>Your rating</legend>
            <div className='flex gap-2'>
              {[1, 2, 3, 4, 5].map(value => (
                <button
                  key={value}
                  type='button'
                  aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`}
                  aria-pressed={rating === value}
                  onClick={() => setRating(value)}
                  className='rounded p-1 focus-visible:outline-2 focus-visible:outline-blue-500'
                >
                  <Star
                    className={`h-6 w-6 ${value <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`}
                  />
                </button>
              ))}
            </div>
          </fieldset>
          <label className='block text-sm font-medium'>
            Your experience
            <textarea
              value={comment}
              onChange={event => setComment(event.target.value)}
              maxLength={3000}
              disabled={submitting}
              rows={3}
              placeholder='What did you use it for? What worked, and what did not?'
              className='mt-2 w-full rounded-lg border border-gray-300 bg-transparent p-3 dark:border-gray-600'
            />
          </label>
          <p className='text-xs text-gray-600 dark:text-gray-400'>
            One review per account. Saving again updates your previous review.
          </p>
          <Button type='submit' disabled={submitting || !rating}>
            {submitting ? 'Saving…' : 'Save review'}
          </Button>
          {submitError && (
            <p role='alert' className='text-sm text-red-600'>
              {submitError}
            </p>
          )}
          {saved && (
            <p
              role='status'
              className='text-sm text-green-700 dark:text-green-400'
            >
              Your review has been saved.
            </p>
          )}
        </form>
      ) : (
        <p className='rounded-xl bg-blue-50 p-4 text-sm dark:bg-blue-900/20'>
          <Link
            to='/login'
            className='text-blue-600 underline dark:text-blue-400'
          >
            Sign in
          </Link>{' '}
          to leave a review.
        </p>
      )}
      {loading ? (
        <p role='status'>Loading reviews…</p>
      ) : loadError ? (
        <div>
          <p role='alert' className='mb-2 text-red-600'>
            {loadError}
          </p>
          <Button
            variant='outline'
            onClick={() => setRefresh(value => value + 1)}
          >
            Retry reviews
          </Button>
        </div>
      ) : !result?.reviews.length ? (
        <p className='text-sm text-gray-600 dark:text-gray-400'>
          No reviews yet. Share your experience.
        </p>
      ) : (
        <>
          {result.reviews.map(review => (
            <article
              key={review._id}
              className='space-y-2 rounded-xl border border-gray-200 p-5 dark:border-gray-700'
            >
              <div className='flex flex-wrap justify-between gap-2'>
                <h3 className='font-medium'>
                  {review.user?.name || 'Former member'}
                </h3>
                <span
                  aria-label={`${review.rating} out of 5 stars`}
                  className='text-sm'
                >
                  ★ {review.rating}/5
                </span>
              </div>
              <time
                dateTime={review.createdAt}
                className='block text-xs text-gray-600 dark:text-gray-400'
              >
                {new Date(review.createdAt).toLocaleDateString()}
              </time>
              <p className='whitespace-pre-wrap break-words text-sm text-gray-600 dark:text-gray-300'>
                {review.comment}
              </p>
            </article>
          ))}
          {result.totalPages > 1 && (
            <div className='flex items-center gap-3'>
              <Button
                variant='outline'
                disabled={page === 1}
                onClick={() => setPage(value => value - 1)}
              >
                Previous reviews
              </Button>
              <span className='text-sm'>
                Page {page} of {result.totalPages}
              </span>
              <Button
                variant='outline'
                disabled={page >= result.totalPages}
                onClick={() => setPage(value => value + 1)}
              >
                Next reviews
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ReviewSection(props: ReviewProps) {
  const { user } = useAuth();
  return (
    <Reviews
      key={`${props.targetType}:${props.targetId}:${user?.id ?? 'guest'}`}
      {...props}
    />
  );
}
