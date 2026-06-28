import { APP_NAME } from '@retcon/common/constants';
import { createUser, getUserCount } from '@retcon/common/db/queries';
import { Form, redirect } from 'react-router';
import { Button } from '~/components/Button';
import { GeneralError } from '~/components/Form/GeneralError';
import { InputWithLabel } from '~/components/Form/InputWithLabel';
import { getUser } from '~/lib/getUser';
import { userSchema } from '~/schemas/user';
import { sessionStorage, storeUserSession } from '~/services/auth.server';
import type { Route } from './+types/Setup';

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getUser(request);

  if (user) return redirect('/');

  const userCount = await getUserCount();

  if (userCount > 0) return redirect('/login');

  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();

  try {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    const validation = userSchema.safeParse({
      email,
      password,
      confirmPassword,
    });

    if (!validation.success) {
      return {
        error: 'There was a problem with your submission. Please check the errors below.',
        fieldErrors: validation.error.flatten().fieldErrors,
      };
    }

    const userCount = await getUserCount();
    if (userCount > 0) {
      return { error: 'Setup has already been completed' };
    }

    const user = await createUser(email, password);

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

export default function SetupPage({ actionData }: Route.ComponentProps) {
  return (
    <div className="mt-8 flex items-center justify-center">
      <div className="w-full max-w-md rounded-lg bg-slate-100 dark:bg-slate-800 p-8 shadow-md">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Welcome to {APP_NAME}!
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Create your admin account to get started
          </p>
        </div>

        {actionData?.error && <GeneralError className="mb-4">{actionData.error}</GeneralError>}

        <Form method="post" className="space-y-6">
          <input type="hidden" name="actionType" value="setup" />

          <div>
            <InputWithLabel
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              required
              placeholder="admin@example.com"
              errors={actionData?.fieldErrors?.email}
            />
          </div>

          <div>
            <InputWithLabel
              id="password"
              label="Password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="••••••••"
              errors={actionData?.fieldErrors?.password}
            />
          </div>

          <div>
            <InputWithLabel
              id="confirmPassword"
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="••••••••"
              errors={actionData?.fieldErrors?.confirmPassword}
            />
          </div>

          <div className="text-center">
            <Button type="submit">Create Admin Account</Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
