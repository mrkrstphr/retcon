import { useEffect, useRef, useState } from 'react';
import { HiSearch } from 'react-icons/hi';
import { useFetcher, useNavigate } from 'react-router';
import { Cover } from '~/components/Cover';
import { useOutsideClickDetector } from '~/hooks/useOutsideClickDetector';
import { comicTitle } from '~/lib/comicTitle';
import { comicDetailsHref } from '~/lib/links';

function useDebouncedSearch<T>(
  action: string,
  method: 'POST' | 'GET' = 'POST',
  options?: { delay?: number; onSearchStart?: () => void },
): {
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  result?: T;
  state: 'idle' | 'searching' | 'results' | 'canceled';
} {
  const [state, setState] = useState<
    'idle' | 'searching' | 'results' | 'canceled'
  >('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fetcher = useFetcher();

  useEffect(() => {
    if (!searchQuery.trim()) {
      setState('idle');
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    if (timerRef.current) {
      setState('idle');
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      const formData = new FormData();
      formData.append('search', searchQuery.trim());
      formData.append('offset', '0');
      fetcher.submit(formData, {
        method,
        action,
      });
      setState('searching');
      options?.onSearchStart?.();
    }, options?.delay || 500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [searchQuery, action, method]);

  useEffect(() => {
    if (fetcher.state === 'loading') setState('results');
  }, [fetcher.state]);

  return {
    searchQuery,
    setSearchQuery,
    result: fetcher.data,
    state,
  };
}

export function Search() {
  const [searchOpen, setSearchOpen] = useState(false);
  const { searchQuery, setSearchQuery, result, state } = useDebouncedSearch<{
    searchResults?: any[];
  }>('/search', 'POST', {
    onSearchStart: () => setSearchOpen(true),
  });

  const [selectedIndex, setSelectedIndex] = useState(-1);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useOutsideClickDetector({
    ref: searchContainerRef,
    onClickOutside: () => {
      setSearchOpen(false);
      setSelectedIndex(-1);
    },
  });

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (
      !searchOpen ||
      !result?.searchResults ||
      result.searchResults.length === 0
    )
      return;

    // Typescript doesn't understand this can't be undefined now
    const searchResults = result.searchResults!;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : 0,
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : searchResults.length - 1,
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && searchResults[selectedIndex]) {
          const comic = searchResults[selectedIndex];
          navigate(comicDetailsHref({ id: comic.id, slug: comic.slug }));
          setSearchQuery('');
          setSearchOpen(false);
          setSelectedIndex(-1);
          searchInputRef.current?.blur();
        }
        break;
      case 'Escape':
        setSearchOpen(false);
        setSelectedIndex(-1);
        searchInputRef.current?.blur();
        break;
    }
  };

  const selectResult = (comic: { id: number; slug: string }) => {
    navigate(comicDetailsHref({ id: comic.id, slug: comic.slug }));
    setSearchQuery('');
    setSearchOpen(false);
    setSelectedIndex(-1);
  };

  return (
    <div className="flex-1 relative" ref={searchContainerRef}>
      <label htmlFor="search" className="sr-only">
        Search comics
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <HiSearch className="h-5 w-5 text-slate-400 dark:text-slate-500" />
        </div>
        <input
          ref={searchInputRef}
          id="search"
          name="search"
          className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-800 rounded-md leading-5 bg-white dark:bg-slate-900 placeholder-slate-500 dark:placeholder-slate-400 text-slate-900 dark:text-slate-100 focus:outline-none focus:placeholder-slate-400 dark:focus:placeholder-slate-300 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
          placeholder="Search comics..."
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchQuery.trim() && !!result?.searchResults?.length) {
              setSearchOpen(true);
            }
          }}
        />
      </div>

      {/* Search Results Dropdown */}
      {searchOpen && (
        <div className="absolute z-50 mt-1 w-[150%] -ml-[25%] md:w-full md:ml-0 bg-white dark:bg-slate-900 shadow-lg rounded-md border border-slate-200 dark:border-slate-800 max-h-96 overflow-y-auto">
          {state === 'searching' && (
            <div className="p-4 text-center text-slate-500 dark:text-slate-400">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto"></div>
              <p className="mt-2 text-sm">Searching...</p>
            </div>
          )}

          {state === 'results' && (result?.searchResults?.length ?? 0) > 0 && (
            <div className="py-2">
              {(result?.searchResults ?? []).map((comic, index) => (
                <button
                  key={comic.id}
                  type="button"
                  className={`w-full px-4 py-3 text-left border-l-2 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors ${
                    selectedIndex === index
                      ? 'bg-slate-50 dark:bg-slate-700/20 border-orange-500'
                      : 'border-transparent'
                  }`}
                  onClick={() => selectResult(comic)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-start space-x-3">
                    <Cover
                      comic={comic}
                      className="max-w-8 aspect-3/4 rounded-sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {comicTitle(comic)}
                      </div>
                      {comic.publisher && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {comic.publisher}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {state === 'results' &&
            (result?.searchResults ?? []).length === 0 && (
              <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                <p className="text-sm">No comics found for "{searchQuery}"</p>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
