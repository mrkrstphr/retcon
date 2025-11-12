import { Link, Outlet } from 'react-router';
import { APP_NAME } from './constants';

export default function Layout() {
  return (
    <div className="py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-4xl text-center font-bold mb-8">
          <Link to="/" className="no-underline!">
            {APP_NAME}
          </Link>
        </h1>
        <Outlet />
      </div>
    </div>
  );
}
