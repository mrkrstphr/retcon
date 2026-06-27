import { APP_NAME } from '@retcon/common/constants';
import { searchComics } from '@retcon/common/db/queries';
import { useEffect, useRef, useState } from 'react';
import { HiSearch } from 'react-icons/hi';
import { Link, useFetcher } from 'react-router';
import { Box } from '~/components/Box';
import { Cover } from '~/components/Cover';
import { NoResults } from '~/components/NoResults';
import { comicTitle } from '~/lib/comicTitle';
import { comicDetailsHref } from '~/lib/links';
import { protectRoute } from '~/lib/protectRoute';
import type { Route } from './+types/Search';

const PAGE_SIZE = 24;

export function meta({ data }: Route.MetaArgs) {
  const q = data?.query;
  return [{ title: q ? `Search: "${q}" - ${APP_NAME}` : `Search - ${APP_NAME}` }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await protectRoute(request);
  const url = new URL(request.url);
  const query = url.searchParams.get('q') || '';
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  if (!query.trim()) {
    return { query: '', results: [], hasMore: false, offset: 0 };
  }

  const results = await searchComics(query.trim(), PAGE_SIZE + 1, offset);
  const hasMore = results.length > PAGE_SIZE;
  return { query, results: results.slice(0, PAGE_SIZE), hasMore, offset };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const searchTerm = formData.get('search') as string;

  if (!searchTerm || searchTerm.trim() === '') {
    return { searchResults: [] };
  }

  const searchResults = await searchComics(searchTerm.trim(), 25, 0);
  return { searchResults };
}

type LoaderData = Awaited<ReturnType<typeof loader>>;

export default function SearchPage({ loaderData }: Route.ComponentProps) {
  const {
    query,
    results: initialResults,
    hasMore: initialHasMore,
    offset: initialOffset,
  } = loaderData;

  const [allResults, setAllResults] = useState(initialResults);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextOffset, setNextOffset] = useState(initialOffset + initialResults.length);

  const fetcher = useFetcher<LoaderData>();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Reset when the search query changes
  useEffect(() => {
    setAllResults(initialResults);
    setHasMore(initialHasMore);
    setNextOffset(initialOffset + initialResults.length);
  }, [query, initialResults, initialHasMore, initialOffset]);

  // Append fetched results
  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      const { results, hasMore: moreAvailable, offset } = fetcher.data;
      setAllResults((prev) => [...prev, ...results]);
      setHasMore(moreAvailable);
      setNextOffset(offset + results.length);
    }
  }, [fetcher.data, fetcher.state]);

  // IntersectionObserver on the sentinel
  useEffect(() => {
    if (!sentinelRef.current) return;

    observerRef.current?.disconnect();

    if (!hasMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && fetcher.state === 'idle') {
          fetcher.load(`/search?q=${encodeURIComponent(query)}&offset=${nextOffset}`);
        }
      },
      { rootMargin: '200px' },
    );

    observerRef.current.observe(sentinelRef.current);

    return () => observerRef.current?.disconnect();
  }, [hasMore, nextOffset, query, fetcher.state]);

  return (
    <div className="flex flex-col gap-2">
      <Box className="p-6">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          {query ? `Search results for "${query}"` : 'Search'}
        </h2>
        {query && allResults.length > 0 && (
          <p className="text-slate-600 dark:text-slate-400">
            {allResults.length}
            {hasMore ? '+' : ''} {allResults.length === 1 ? 'result' : 'results'} found
          </p>
        )}
      </Box>

      {allResults.length > 0 && (
        <Box>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {allResults.map((comic) => (
              <Link
                key={comic.id}
                to={comicDetailsHref(comic)}
                className="bg-slate-50 dark:bg-slate-900 rounded-lg no-underline! p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors block"
              >
                <div className="aspect-3/4 mb-3 bg-slate-200 dark:bg-slate-700 rounded relative">
                  <Cover comic={comic} />
                </div>
                <div className="text-sm text-center">
                  <div className="font-medium text-slate-900 dark:text-slate-100 mb-1 overflow-hidden">
                    <div className="line-clamp-2 leading-tight">{comicTitle(comic)}</div>
                  </div>
                  {comic.publisher && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                      {comic.publisher}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Sentinel + loading indicator */}
          <div ref={sentinelRef} className="mt-4">
            {fetcher.state === 'loading' && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500" />
              </div>
            )}
          </div>
        </Box>
      )}

      {query && allResults.length === 0 && fetcher.state !== 'loading' && (
        <NoResults
          icon={HiSearch}
          title={`No results for "${query}"`}
          details="Try a different search term."
        />
      )}

      {!query && (
        <NoResults
          icon={HiSearch}
          title="Enter a search term"
          details="Use the search bar above to find comics."
        />
      )}
    </div>
  );
}
