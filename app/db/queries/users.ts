import { and, eq, sql } from 'drizzle-orm';
import { db } from '../index';
import { firstOrNull } from '../lib/firstOrNull';
import { users } from '../schema';

export async function getUserByCredentials(email: string, password: string) {
  const query = db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(
      and(
        eq(users.email, email),
        sql`${users.passwordHash} = crypt(${password}, ${users.passwordHash})`,
      ),
    )
    .limit(1);

  return firstOrNull(query);
}
