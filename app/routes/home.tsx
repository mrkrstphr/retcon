import { useEffect, useState } from 'react';
import { useFetcher } from 'react-router';
import { APP_NAME } from '../constants';
import {
  getComicCount,
  getLastScanTime,
  getRecentComics,
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

  if (!searchTerm || searchTerm.trim() === '') {
    return { searchResults: [], searchTerm: '' };
  }

  const searchResults = await searchComics(searchTerm.trim());
  return { searchResults, searchTerm: searchTerm.trim() };
}

// Helper function to generate cover image path
const getCoverPath = (id: string) => {
  const subdirectory = id[0].toLowerCase();
  return `/covers/${subdirectory}/${id}.jpg`;
};

export default function Home({ loaderData }: Route.ComponentProps) {
  const { comicCount, recentComics, lastScanTime } = loaderData;
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const fetcher = useFetcher<typeof action>();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Trigger search when debounced term changes
  useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      const formData = new FormData();
      formData.append('search', debouncedSearchTerm);
      fetcher.submit(formData, { method: 'POST' });
    }
  }, [debouncedSearchTerm]); // Remove fetcher dependency

  const isSearching = !!searchTerm.trim();
  const searchResults = fetcher.data?.searchResults || [];
  const displayComics = isSearching ? searchResults : recentComics;
  const isLoading = fetcher.state === 'submitting';
  const hasSearchCompleted =
    isSearching && fetcher.state === 'idle' && fetcher.data !== undefined;

  return (
    <div className="py-16">
      <div className="text-center max-w-6xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8">{APP_NAME}</h1>

        <div className="bg-white dark:bg-slate-950 rounded-lg shadow-md p-8 mb-8">
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
                {searchTerm && !isLoading && (
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
                {isLoading && (
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Loading state when searching */}
        {isSearching && isLoading && (
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
        {(!isSearching ||
          (isSearching && hasSearchCompleted && searchResults.length > 0)) &&
          displayComics.length > 0 && (
            <div className="bg-white dark:bg-slate-950 rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-6">
                {isSearching
                  ? `Search Results (${searchResults.length})`
                  : 'Recently Added Comics'}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {displayComics.map((comic) => (
                  <div
                    key={comic.id}
                    className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
                  </div>
                ))}
              </div>
            </div>
          )}

        {isSearching && hasSearchCompleted && searchResults.length === 0 && (
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
    </div>
  );
}
