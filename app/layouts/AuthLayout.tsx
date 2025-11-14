import { Outlet } from 'react-router';
import { APP_NAME } from '~/constants';

export default function AuthLayout() {
  return (
    <div className="py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-4xl text-center font-bold mb-4">{APP_NAME}</h1>

        <Outlet />
      </div>
    </div>
  );
}
