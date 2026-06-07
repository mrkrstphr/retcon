import { sessionStorage } from '~/services/auth.server';

export async function getUser(request: Request) {
  const session = await sessionStorage.getSession(request.headers.get('cookie'));
  const user = session.get('user');

  return user;
}
