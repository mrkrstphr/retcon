import { upsertUserComicProgress } from '~/db/queries';
import { getUser } from '~/lib/getUser';
import { sqidToId } from '~/lib/sqids';
import type { Route } from './+types/UserComicProgress';

export const action = async ({ params, request }: Route.ActionArgs) => {
  const user = await getUser(request);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const sqid = params.sqid;
  const id = sqidToId(sqid);

  const { currentPage } = await request.json();

  if (!currentPage) {
    return new Response('Missing data', { status: 400 });
  }

  await upsertUserComicProgress(user.id, id, currentPage);

  return new Response('OK');
};
