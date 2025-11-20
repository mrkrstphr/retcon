import { getUserByCredentials } from '@retcon/common/db/queries';
import { createCookieSessionStorage } from 'react-router';
import { Authenticator } from 'remix-auth';
import { FormStrategy } from 'remix-auth-form';
import type { User } from './types';

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '__session',
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secrets: [process.env.COOKIE_SECRET ?? 'b4n4n4z'],
    secure: process.env.NODE_ENV === 'production',
  },
});

export const authenticator = new Authenticator<User>();

async function login(email: string, password: string): Promise<User> {
  let user: User | null = null;
  try {
    user = await getUserByCredentials(email, password);
  } catch (error) {
    console.error('Error during login:', error);
    throw new Error('An error occurred while trying to log in');
  }

  if (!user) {
    throw new Error('Invalid email or password');
  }

  return user;
}

export async function storeUserSession(user: User, request: Request) {
  const session = await sessionStorage.getSession(
    request.headers.get('cookie'),
  );

  session.set('user', user);

  return session;
}

authenticator.use(
  new FormStrategy(async ({ form }) => {
    const email = form.get('email') as string;
    const password = form.get('password') as string;

    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    return await login(email, password);
  }),
  'user-pass',
);
