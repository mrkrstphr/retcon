import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useFetcher } from 'react-router';
import { getCoverPath } from '~/lib/getCoverPath';
import { APP_NAME } from '../constants';
import {
  getComicCount,
  getLastScanTime,
  getRecentComics,
  getSearchCount,
  searchComics,
} from '../db/queries';
import type { Route } from './+types/home';

export function meta({}: Route.MetaArgs) {
  return [
    { title: `${APP_NAME} - Home` },
    {
      name: 'description',
      content: 'Organize and browse your comic book collection',
    },
  ];
}

export async function loader({}: Route.LoaderArgs) {
  const [comicCount, recentComics, lastScanTime] = await Promise.all([
    getComicCount(),
    getRecentComics(10),
    getLastScanTime(),
  ]);

  return {
    comicCount,
    recentComics,
    lastScanTime,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const searchTerm = formData.get('search') as string;
  const offset = parseInt((formData.get('offset') as string) || '0');
  const limit = 25;

  if (!searchTerm || searchTerm.trim() === '') {
    return {
      searchResults: [],
      searchTerm: '',
      hasMore: false,
      offset: 0,
      totalCount: 0,
    };
  }

  const [searchResults, totalCount] = await Promise.all([
    searchComics(searchTerm.trim(), limit, offset),
    offset === 0 ? getSearchCount(searchTerm.trim()) : Promise.resolve(0), // Only get count on first page
  ]);

  const hasMore = searchResults.length === limit; // If we get full page, there might be more

  return {
    searchResults,
    searchTerm: searchTerm.trim(),
    hasMore,
    offset,
    totalCount,
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { comicCount, recentComics, lastScanTime } = loaderData;
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [allSearchResults, setAllSearchResults] = useState<any[]>([]);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [totalSearchCount, setTotalSearchCount] = useState(0);
  const fetcher = useFetcher<typeof action>();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset pagination when search term changes
  useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      setAllSearchResults([]);
      setCurrentOffset(0);
      setIsLoadingMore(false);
      setTotalSearchCount(0); // Reset total count
      const formData = new FormData();
      formData.append('search', debouncedSearchTerm);
      formData.append('offset', '0');
      fetcher.submit(formData, { method: 'POST' });
    } else {
      setAllSearchResults([]);
      setCurrentOffset(0);
      setHasMore(false);
      setIsLoadingMore(false);
      setTotalSearchCount(0);
    }
  }, [debouncedSearchTerm]);

  // Handle search results
  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      const {
        searchResults,
        hasMore: newHasMore,
        offset,
        totalCount,
      } = fetcher.data;

      // Batch all state updates to prevent multiple re-renders
      if (offset === 0) {
        // New search - replace all results
        setAllSearchResults(searchResults);
        setHasMore(newHasMore);
        setCurrentOffset(offset + searchResults.length);
        setIsLoadingMore(false);
        if (totalCount !== undefined) {
          setTotalSearchCount(totalCount);
        }
      } else {
        // Load more - append results and restore scroll position
        setAllSearchResults((prev) => {
          const newResults = [...prev, ...searchResults];

          // Restore scroll position after next render
          if (scrollPosition > 0) {
            requestAnimationFrame(() => {
              window.scrollTo(0, scrollPosition);
              setScrollPosition(0);
            });
          }

          return newResults;
        });

        setHasMore(newHasMore);
        setCurrentOffset(offset + searchResults.length);
        setIsLoadingMore(false);
      }
    }
  }, [fetcher.data, fetcher.state, scrollPosition]);

  // Load more function
  const loadMore = useCallback(() => {
    if (
      debouncedSearchTerm.trim() &&
      hasMore &&
      !isLoadingMore &&
      fetcher.state === 'idle'
    ) {
      // Store current scroll position before making request
      setScrollPosition(window.scrollY);
      setIsLoadingMore(true);

      const formData = new FormData();
      formData.append('search', debouncedSearchTerm);
      formData.append('offset', currentOffset.toString());

      // Submit the form data
      fetcher.submit(formData, { method: 'POST' });
    }
  }, [
    debouncedSearchTerm,
    hasMore,
    isLoadingMore,
    fetcher.state,
    currentOffset,
  ]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px', // Trigger 100px before the element comes into view
      },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [loadMore]);

  const isSearching = !!searchTerm.trim();
  const displayComics = isSearching ? allSearchResults : recentComics;
  const isInitialLoading =
    fetcher.state === 'submitting' && currentOffset === 0;
  const hasSearchCompleted =
    isSearching &&
    (fetcher.state === 'idle' || isLoadingMore) &&
    (fetcher.data !== undefined || allSearchResults.length > 0);

  return (
    <div>
      <div className="bg-white dark:bg-slate-950 rounded-lg shadow-md text-center p-8 mb-8">
        <h2 className="text-lg font-medium text-slate-600 dark:text-slate-200 mb-2">
          Total Comics
        </h2>
        <p className="text-5xl font-bold text-green-600 dark:text-green-300">
          {comicCount}
        </p>
      </div>

      {/* Search Section */}
      <div className="bg-white dark:bg-slate-950 rounded-lg shadow-md p-8 mb-8">
        <div>
          <label htmlFor="search" className="sr-only">
            Search comics
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-12 py-3 border border-slate-300 dark:border-slate-600 rounded-md leading-5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search by series, filename, or publisher..."
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {searchTerm && !isInitialLoading && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none focus:text-slate-600 dark:focus:text-slate-200 mr-2"
                  aria-label="Clear search"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
              {isInitialLoading && (
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loading state when searching */}
      {isSearching && isInitialLoading && (
        <div className="bg-white dark:bg-slate-950 rounded-lg shadow-md p-8">
          <div className="text-center text-slate-500 dark:text-slate-400">
            <div className="flex items-center justify-center mb-4">
              <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
            <p>Searching your comic collection...</p>
          </div>
        </div>
      )}

      {/* Results (either search results or recent comics) */}
      {displayComics.length > 0 && !isInitialLoading && (
        <div className="bg-white dark:bg-slate-950 rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-6">
            {isSearching
              ? `Search Results (${totalSearchCount > 0 ? totalSearchCount : allSearchResults.length})`
              : 'Recently Added Comics'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {displayComics.map((comic) => (
              <Link
                key={comic.id}
                to={`/comic/${comic.id}`}
                className="bg-slate-50 dark:bg-slate-900 rounded-lg no-underline! p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors block"
              >
                <div className="aspect-3/4 mb-3 bg-slate-200 dark:bg-slate-700 rounded overflow-hidden">
                  <img
                    src={getCoverPath(comic.id)}
                    alt={
                      comic.series && comic.number
                        ? `${comic.series} #${comic.number}`
                        : 'Comic cover'
                    }
                    className="w-full h-full object-cover object-top"
                    onError={(e) => {
                      // Hide broken images
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div className="text-sm text-center">
                  <div className="font-medium text-slate-900 dark:text-slate-100 mb-1 overflow-hidden">
                    <div className="line-clamp-2 leading-tight">
                      {comic.series && comic.number
                        ? `${comic.series} #${comic.number}`
                        : comic.fileName
                            .split('/')
                            .pop()
                            ?.replace(/\.[^/.]+$/, '') || comic.fileName}
                    </div>
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

          {/* Load more section for search results */}
          {isSearching && (
            <div className="mt-8">
              {hasMore && (
                <div ref={loadMoreRef} className="text-center">
                  {isLoadingMore ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
                      <span className="text-slate-600 dark:text-slate-400">
                        Loading more comics...
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={loadMore}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors"
                    >
                      Load More
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isSearching && hasSearchCompleted && allSearchResults.length === 0 && (
        <div className="bg-white dark:bg-slate-950 rounded-lg shadow-md p-8">
          <div className="text-center text-slate-500 dark:text-slate-400">
            <svg
              className="mx-auto h-12 w-12 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p>No comics found matching "{searchTerm}"</p>
          </div>
        </div>
      )}

      {lastScanTime && (
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Last scan: {new Date(lastScanTime).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
