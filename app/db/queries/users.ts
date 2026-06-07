import { and, count, eq, sql } from 'drizzle-orm';
import { db } from '../index.js';
import { countOrZero } from '../lib/countOrZero.js';
import { first } from '../lib/first.js';
import { firstOrNull } from '../lib/firstOrNull.js';
import { users } from '../schema.js';

export const getUserByCredentials = (email: string, password: string) =>
  firstOrNull(
    db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(
        and(
          eq(users.email, email),
          sql`${users.passwordHash} = crypt(${password}, ${users.passwordHash})`,
        ),
      )
      .limit(1),
  );

export const getUserCount = () => countOrZero(db.select({ count: count() }).from(users));

export const createUser = (email: string, password: string) =>
  first(
    db
      .insert(users)
      .values({
        email,
        passwordHash: sql`crypt(${password}, gen_salt('bf'))`,
      })
      .returning({ id: users.id, email: users.email }),
  );
