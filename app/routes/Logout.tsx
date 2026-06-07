import { redirect } from 'react-router';
import { sessionStorage } from '~/services/auth.server';
import type { Route } from './+types/Logout';

export async function loader({ request }: Route.LoaderArgs) {
  const session = await sessionStorage.getSession(request.headers.get('cookie'));
  return redirect('/login', {
    headers: { 'Set-Cookie': await sessionStorage.destroySession(session) },
  });
}
