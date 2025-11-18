import { Form, redirect } from 'react-router';
import { getUserCount } from '~/db/queries/users';
import { getUser } from '~/lib/getUser';
import {
  authenticator,
  sessionStorage,
  storeUserSession,
} from '~/services/auth.server';
import type { Route } from './+types/Login';

export async function action({ request }: Route.ActionArgs) {
  try {
    const user = await authenticator.authenticate('user-pass', request);

    const session = await storeUserSession(user, request);

    return redirect('/', {
      headers: {
        'Set-Cookie': await sessionStorage.commitSession(session),
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }

    throw error;
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getUser(request);

  if (user) return redirect('/');

  const userCount = await getUserCount();

  if (userCount === 0) return redirect('/setup');

  return null;
}

export default function Login({ actionData }: Route.ComponentProps) {
  return (
    <div className="mt-8 flex items-center justify-center">
      <div className="w-full max-w-md rounded-lg bg-slate-100 dark:bg-slate-800 p-8 shadow-md">
        {actionData?.error ? (
          <div className="mb-4 rounded bg-red-300/50 dark:bg-red-700/50 px-4 py-2 text-sm text-red-700 dark:text-red-100">
            {actionData.error}
          </div>
        ) : null}

        <Form method="post" className="space-y-6">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium">
              Email
            </label>
            <input
              type="email"
              name="email"
              id="email"
              className="bg-slate-50 border border-slate-300 text-slate-900 rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              placeholder="you@domain.com"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium"
            >
              Password
            </label>
            <input
              type="password"
              name="password"
              id="password"
              placeholder="••••••••"
              className="bg-slate-50 border border-slate-300 text-slate-900 rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Sign In
          </button>
        </Form>
      </div>
    </div>
  );
}
