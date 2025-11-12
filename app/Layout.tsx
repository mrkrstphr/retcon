import { useState } from 'react';
import { HiUserCircle } from 'react-icons/hi';
import { ImBooks } from 'react-icons/im';
import {
  Link,
  Outlet,
  redirect,
  useLocation,
  type LinkProps,
} from 'react-router';
import type { Route } from './+types/Layout';
import { APP_NAME } from './constants';
import { getUser } from './lib/getUser';

const NavLink = ({ to, children }: LinkProps) => {
  const location = useLocation();

  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors no-underline! ${
        location.pathname === to
          ? 'bg-blue-600 text-white!'
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      {children}
    </Link>
  );
};

async function protectRoute(request: Request) {
  const user = await getUser(request);

  if (!user) {
    throw redirect('/login');
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  await protectRoute(request);

  const user = await getUser(request);

  return { user };
}

export default function Layout({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <div className="py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="w-full flex items-center gap-2">
          <h1 className="text-4xl font-bold mb-4 flex-1">
            <Link
              to="/"
              className="no-underline! inline-flex items-center gap-2"
            >
              <ImBooks />
              {APP_NAME}
            </Link>
          </h1>

          <div className="relative">
            <HiUserCircle
              className="size-8 hover:text-orange-600 dark:hover:text-orange-400 cursor-pointer"
              onClick={() => setUserMenuOpen((open) => !open)}
            />
            {userMenuOpen && (
              <div className="bg-slate-950 border border-slate-800 p-2 rounded-md shadow absolute right-0 mt-1">
                <div className="whitespace-nowrap p-2">
                  Hello, {user.email.substr(0, user.email.indexOf('@'))}
                </div>
                <div className="bg-slate-900 rounded-md p-4">
                  <Link to="/logout">Logout</Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex align-center mb-8 w-full">
          <div className="flex space-x-6">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/publishers">Publishers</NavLink>
          </div>
        </nav>

        <Outlet />
      </div>
    </div>
  );
}
