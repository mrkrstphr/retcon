// app/services/auth.server.ts
import { and, eq, sql } from 'drizzle-orm';
import { createCookieSessionStorage } from 'react-router';
import { Authenticator } from 'remix-auth';
import { FormStrategy } from 'remix-auth-form';
import { db } from '~/db';
import { users } from '~/db/schema';

// Define your user type
type User = {
  id: number;
  email: string;
  name: string;
};

// Create a session storage
export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '__session',
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secrets: ['s3cr3t'], // replace this with an actual secret
    secure: process.env.NODE_ENV === 'production',
  },
});

// Create an instance of the authenticator, pass a generic with what
// strategies will return
export const authenticator = new Authenticator<User>();

// Your authentication logic (replace with your actual DB/API calls)
async function login(email: string, password: string): Promise<User> {
  let user: User | null = null;
  try {
    const query = db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(
        and(
          eq(users.email, email),
          sql`${users.passwordHash} = crypt(${password}, ${users.passwordHash})`,
        ),
      )
      .limit(1);

    const result = await query;

    user = result[0] || null;
  } catch (error) {
    console.error('Error during login:', error);
    throw new Error('An error occurred while trying to log in');
  }

  if (!user) {
    throw new Error('Invalid email or password');
  }

  return user;
}

// Tell the Authenticator to use the form strategy
authenticator.use(
  new FormStrategy(async ({ form }) => {
    const email = form.get('email') as string;
    const password = form.get('password') as string;

    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // the type of this user must match the type you pass to the
    // Authenticator the strategy will automatically inherit the type if
    // you instantiate directly inside the `use` method
    return await login(email, password);
  }),
  // each strategy has a name and can be changed to use the same strategy
  // multiple times, especially useful for the OAuth2 strategy.
  'user-pass',
);
