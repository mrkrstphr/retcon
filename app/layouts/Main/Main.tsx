import { APP_NAME } from '@retcon/common/constants';
import { getComicCount, getLastScanTime } from '@retcon/common/db/queries';
import { useState } from 'react';
import { FaFileCircleQuestion } from 'react-icons/fa6';
import { HiCollection, HiHome, HiX } from 'react-icons/hi';
import type { IconType } from 'react-icons/lib';
import { MdFiberNew } from 'react-icons/md';
import { Link, Outlet, useLocation, type LinkProps } from 'react-router';
import { Box } from '~/components/Box';
import { getUser } from '~/lib/getUser';
import { protectRoute } from '~/lib/protectRoute';
import type { Route } from './+types/Main';
import { Search } from './Search';
import { Stats } from './Stats';
import { UserMenu } from './UserMenu';

const SidebarLink = ({
  to,
  children,
  icon: Icon,
  onClick,
}: LinkProps & {
  icon?: IconType;
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
const navigation = [
  { name: 'Home', href: '/', icon: HiHome },
  { name: 'Publishers', href: '/publishers', icon: HiCollection },
  { name: 'Unread', href: '/unread', icon: MdFiberNew },
  { name: 'Loose Comics', href: '/loose', icon: FaFileCircleQuestion },
];

export default function Layout({ loaderData }: Route.ComponentProps) {
  const { user, comicCount, lastScanTime } = loaderData;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col gap-2 w-full p-2 md:p-4 pb-0 overflow-hidden bg-white dark:bg-slate-900">
      {/* New header area */}
      <Box className="flex items-center gap-2 md:gap-4 w-full">
        <div className="flex items-center shrink-0 px-4">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-0 bg-transparent border-0 cursor-pointer"
            aria-label="Open navigation"
          >
            <img src="/logo-small.png" alt="" className="h-8 w-auto" />
          </button>
          <Link to="/" className="no-underline! hidden md:block">
            <img src="/logo.png" alt={APP_NAME} className="h-8 w-auto dark:hidden" />
            <img src="/logo-white.png" alt={APP_NAME} className="h-8 w-auto hidden dark:block" />
          </Link>
        </div>

        <Search />
        <UserMenu user={user} />
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
                aria-label="Close navigation"
              >
                <HiX className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 flex flex-col h-0 pt-5 pb-4 overflow-y-auto">
              <div className="shrink-0 flex items-center px-4">
                <img src="/logo-small.png" alt={APP_NAME} className="h-8 w-auto" />
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

              <Stats className="mt-4" comicCount={comicCount} lastScanTime={lastScanTime} />
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 w-full">
        {/* Desktop sidebar */}
        <div className="hidden md:flex h-full w-84">
          <Box className="flex flex-col w-full">
            <nav className="flex-1 px-2 space-y-1">
              {navigation.map((item) => (
                <SidebarLink key={item.name} to={item.href} icon={item.icon}>
                  {item.name}
                </SidebarLink>
              ))}
            </nav>

            <Stats className="mt-4" comicCount={comicCount} lastScanTime={lastScanTime} />
          </Box>
        </div>

        {/* Main content area */}
        <main className="w-full h-[calc(100dvh-8rem)] overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
