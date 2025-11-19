import { redirect } from 'react-router';
import { getUser } from './getUser';

export async function protectRoute(request: Request) {
  const user = await getUser(request);

  if (!user) {
    throw redirect('/login');
  }

  return user;
}
