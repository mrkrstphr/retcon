import { ImBooks } from 'react-icons/im';
import { Link, Outlet, useLocation, type LinkProps } from 'react-router';
import { APP_NAME } from './constants';

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

export default function Layout() {
  return (
    <div className="py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-4xl text-center font-bold mb-4">
          <Link to="/" className="no-underline! inline-flex items-center gap-2">
            <ImBooks />
            {APP_NAME}
          </Link>
        </h1>

        {/* Navigation */}
        <nav className="flex justify-center mb-8">
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
