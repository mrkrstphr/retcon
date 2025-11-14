import { getComicByIdForUser, upsertUserComicProgress } from '~/db/queries';
import { protectRoute } from '~/lib/protectRoute';
import { sqidToId } from '~/lib/sqids';
import type { Route } from './+types/UserComicProgress';

export const action = async ({ params, request }: Route.ActionArgs) => {
  const user = await protectRoute(request);

  const sqid = params.sqid;
  const id = sqidToId(sqid);

  const { currentPage } = await request.json();

  if (!currentPage) {
    return new Response('Missing data', { status: 400 });
  }

  const comic = await getComicByIdForUser(user.id, id);

  if (!comic) {
    return new Response('Comic not found', { status: 404 });
  }

  await upsertUserComicProgress(
    user.id,
    id,
    currentPage,
    currentPage >= comic.pageCount,
  );

  return new Response('OK');
};
