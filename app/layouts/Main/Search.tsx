import { useEffect, useRef, useState } from 'react';
import { HiSearch } from 'react-icons/hi';
import { useFetcher, useNavigate } from 'react-router';
import { Cover } from '~/components/Cover';
import { useOutsideClickDetector } from '~/hooks/useOutsideClickDetector';
import { comicDetailsHref } from '~/lib/links';

export function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fetcher = useFetcher();
  const navigate = useNavigate();

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchOpen(false);
      setSelectedIndex(-1);
      return;
    }

    const timer = setTimeout(() => {
      const formData = new FormData();
      formData.append('search', searchQuery.trim());
      formData.append('offset', '0');
      fetcher.submit(formData, {
        method: 'POST',
        action: '/?index',
      });
      setSearchOpen(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle search results
  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      setSearchResults(fetcher.data.searchResults || []);
    }
  }, [fetcher.data, fetcher.state]);

  useOutsideClickDetector({
    ref: searchRef,
    onClickOutside: () => {
      setSearchOpen(false);
      setSelectedIndex(-1);
    },
  });

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!searchOpen || searchResults.length === 0) return;

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
    <div className="flex-1 relative" ref={searchRef}>
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
            if (searchQuery.trim() && searchResults.length > 0) {
              setSearchOpen(true);
            }
          }}
        />
      </div>

      {/* Search Results Dropdown */}
      {searchOpen && searchQuery.trim() && (
        <div className="absolute z-50 mt-1 w-[150%] -ml-[25%] md:w-full md:ml-0 bg-white dark:bg-slate-900 shadow-lg rounded-md border border-slate-200 dark:border-slate-800 max-h-96 overflow-y-auto">
          {fetcher.state === 'submitting' ? (
            <div className="p-4 text-center text-slate-500 dark:text-slate-400">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto"></div>
              <p className="mt-2 text-sm">Searching...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="py-2">
              {searchResults.map((comic, index) => (
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
                        {comic.series
                          ? `${comic.series} #${comic.number || '?'}`
                          : comic.fileName}
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
          ) : (
            <div className="p-4 text-center text-slate-500 dark:text-slate-400">
              <p className="text-sm">No comics found for "{searchQuery}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
