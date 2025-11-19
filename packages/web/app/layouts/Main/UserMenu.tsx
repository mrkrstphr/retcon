import { useRef, useState } from 'react';
import { FaUserAstronaut } from 'react-icons/fa6';
import { Link } from 'react-router';
import { useOutsideClickDetector } from '~/hooks/useOutsideClickDetector';
import type { User } from '~/services/types';

export const UserMenu = ({ user }: { user: User }) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useOutsideClickDetector({
    ref: userMenuRef,
    onClickOutside: () => {
      setUserMenuOpen(false);
    },
  });

  return (
    <div className="ml-4 flex items-center md:ml-6" ref={userMenuRef}>
      <div className="relative">
        <button
          type="button"
          className="max-w-xs flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 p-2 rounded-full"
          onClick={() => setUserMenuOpen(!userMenuOpen)}
        >
          <FaUserAstronaut className="size-6 text-slate-400 dark:text-slate-500" />
        </button>

        {userMenuOpen && (
          <div className="origin-top-right absolute right-0 mt-2 w-64 rounded-md text-left shadow-lg py-1 bg-white dark:bg-slate-700 ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
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
  );
};
