import { useEffect, useRef, useState, type HTMLAttributes } from 'react';
import {
  HiCollection,
  HiHome,
  HiSearch,
  HiUserCircle,
  HiX,
} from 'react-icons/hi';
import { ImBooks } from 'react-icons/im';
import {
  Link,
  Outlet,
  useFetcher,
  useLocation,
  useNavigate,
  type LinkProps,
} from 'react-router';
import type { Route } from './+types/Layout';
import { Box } from './components/Box';
import { APP_NAME } from './constants';
import { getComicCount, getLastScanTime } from './db/queries';
import { getUser } from './lib/getUser';
import { comicDetailsHref } from './lib/links';
import { protectRoute } from './lib/protectRoute';

const SidebarLink = ({
  to,
  children,
  icon: Icon,
  onClick,
}: LinkProps & {
  icon?: React.ComponentType<any>;
  onClick?: () => void;
}) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md no-underline! transition-colors ${
        isActive
          ? 'bg-slate-200 dark:bg-slate-900 text-orange-900 dark:text-orange-100'
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}
    >
      {Icon && (
        <Icon
          className={`mr-3 h-5 w-5 shrink-0 ${
            isActive
              ? 'text-orange-600 dark:text-orange-400'
              : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-400'
          }`}
        />
      )}
      {children}
    </Link>
  );
};

export async function loader({ request }: Route.LoaderArgs) {
  await protectRoute(request);

  const [user, comicCount, lastScanTime] = await Promise.all([
    getUser(request),
    getComicCount(),
    getLastScanTime(),
  ]);

  return { user, comicCount, lastScanTime };
}

const Stats = ({
  className,
  comicCount,
  lastScanTime,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  comicCount: number;
  lastScanTime: Date | null;
}) => {
  const classes = [
    'flex flex-col gap-1',
    'pt-2 mx-2',
    'text-xs text-center text-gray-500 dark:text-gray-400 border-t border-gray-300 dark:border-gray-700',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const lastScan = lastScanTime
    ? new Date(lastScanTime).toLocaleString([], {
        hour: 'numeric',
        minute: 'numeric',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      })
    : 'Never';

  return (
    <div className={classes} {...props}>
      <div>{comicCount} total comics</div>
      <div>Last Scan: {lastScan}</div>
    </div>
  );
};

export default function Layout({ loaderData }: Route.ComponentProps) {
  const { user, comicCount, lastScanTime } = loaderData;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fetcher = useFetcher();
  const navigate = useNavigate();

  const navigation = [
    { name: 'Home', href: '/', icon: HiHome },
    { name: 'Publishers', href: '/publishers', icon: HiCollection },
  ];

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

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
        setSelectedIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const selectResult = (comic: any) => {
    navigate(comicDetailsHref({ id: comic.id, slug: comic.slug }));
    setSearchQuery('');
    setSearchOpen(false);
    setSelectedIndex(-1);
  };

  return (
    <div className="h-screen flex flex-col gap-2 w-full p-2 md:p-4 pb-0 overflow-hidden bg-white dark:bg-slate-900">
      {/* New header area */}
      <Box className="flex items-center gap-2 md:gap-4 w-full">
        <div className="flex items-center shrink-0 px-4">
          <ImBooks
            className="h-8 w-8 text-orange-600 dark:text-orange-400 cursor-pointer md:cursor-auto"
            onClick={() => setSidebarOpen(true)}
          />
          <Link
            to="/"
            className="ml-2 text-xl font-bold hidden no-underline! md:block text-slate-900 dark:text-white"
          >
            {APP_NAME}
          </Link>
        </div>

        {/* Search bar */}
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
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md leading-5 bg-white dark:bg-slate-700 placeholder-slate-500 dark:placeholder-slate-400 text-slate-900 dark:text-slate-100 focus:outline-none focus:placeholder-slate-400 dark:focus:placeholder-slate-300 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
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
            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-700 shadow-lg rounded-md border border-slate-200 dark:border-slate-600 max-h-96 overflow-y-auto">
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
                      className={`w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors ${
                        selectedIndex === index
                          ? 'bg-orange-50 dark:bg-orange-900/20 border-r-2 border-orange-500'
                          : ''
                      }`}
                      onClick={() => selectResult(comic)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="shrink-0 w-8 h-10 bg-slate-200 dark:bg-slate-600 rounded"></div>
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

        {/* User menu */}
        <div className="ml-4 flex items-center md:ml-6">
          <div className="relative">
            <button
              type="button"
              className="max-w-xs flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 lg:p-2 lg:rounded-md"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <HiUserCircle className="h-8 w-8 text-slate-400 dark:text-slate-500" />
              <span className="hidden text-slate-700 dark:text-slate-300 text-sm font-medium lg:block">
                {user.name}
              </span>
            </button>

            {userMenuOpen && (
              <div className="origin-top-right absolute right-0 mt-2 w-64 rounded-md text-left shadow-lg py-1 bg-white dark:bg-slate-700 ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 border-b truncate border-slate-200 dark:border-slate-600">
                  Signed in as
                  <br />
                  <span className="font-medium">{user.email}</span>
                </div>
                <Link
                  to="/logout"
                  className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 no-underline!"
                >
                  Sign out
                </Link>
              </div>
            )}
          </div>
        </div>
      </Box>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 flex z-40 md:hidden">
          <div
            className="fixed inset-0 bg-slate-600 bg-opacity-75"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Mobile sidebar */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-slate-800">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <HiX className="h-6 w-6 text-white" />
              </button>
            </div>

            <div className="flex-1 flex flex-col h-0 pt-5 pb-4 overflow-y-auto">
              <div className="shrink-0 flex items-center px-4">
                <ImBooks className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                <span className="ml-2 text-xl font-bold text-slate-900 dark:text-white">
                  {APP_NAME}
                </span>
              </div>
              <nav className="flex-1 mt-5 px-2 space-y-1">
                {navigation.map((item) => (
                  <SidebarLink
                    key={item.name}
                    to={item.href}
                    icon={item.icon}
                    onClick={() => setSidebarOpen(false)}
                  >
                    {item.name}
                  </SidebarLink>
                ))}
              </nav>
              <div className="text-xs text-center text-gray-500 dark:text-gray-400 border-t border-gray-300 dark:border-gray-600 pt-2 mx-2">
                <div>{comicCount} total comics</div>
                <div>
                  Last Scan:{' '}
                  {lastScanTime
                    ? new Date(lastScanTime).toLocaleString([], {
                        hour: 'numeric',
                        minute: 'numeric',
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric',
                      })
                    : 'Never'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 w-full">
        {/* Desktop sidebar */}
        <div className="hidden md:flex md:shrink-0">
          <Box className="h-full">
            <div className="flex flex-col w-64">
              <div className="flex flex-col h-0 flex-1">
                <div className="flex-1 flex flex-col overflow-y-auto">
                  <nav className="flex-1 px-2 space-y-1">
                    {navigation.map((item) => (
                      <SidebarLink
                        key={item.name}
                        to={item.href}
                        icon={item.icon}
                      >
                        {item.name}
                      </SidebarLink>
                    ))}
                  </nav>

                  <Stats
                    className="mt-4"
                    comicCount={comicCount}
                    lastScanTime={lastScanTime}
                  />
                </div>
              </div>
            </div>
          </Box>
        </div>

        {/* Main content area */}
        <main className="max-w-7xl w-full h-[calc(100dvh-8rem)] overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
