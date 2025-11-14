import { redirect } from 'react-router';
import {
  deleteUserComicRecord,
  getComicByIdForUser,
  markComicAsRead,
} from '~/db/queries';
import { getUser } from '~/lib/getUser';
import { comicDetailsHref } from '~/lib/links';
import { protectRoute } from '~/lib/protectRoute';
import { sqidToId } from '~/lib/sqids';
import type { Route } from './+types/MarkIssueReadOrUnread';

export async function action({ request, params }: Route.ActionArgs) {
  await protectRoute(request);
  const user = await getUser(request);

  const { sqid } = params;
  const comicId = sqidToId(sqid);

  // Get comic data for redirect
  const comic = await getComicByIdForUser(comicId, user.id);
  if (!comic) {
    throw new Response('Comic not found', { status: 404 });
  }

  try {
    if (request.method === 'POST') {
      // Mark comic as read
      await markComicAsRead(user.id, comicId);
      return redirect(comicDetailsHref({ id: comic.id, slug: comic.slug }));
    } else if (request.method === 'DELETE') {
      // Delete user_comic record (unmark/remove from reading list)
      await deleteUserComicRecord(user.id, comicId);
      return redirect(comicDetailsHref({ id: comic.id, slug: comic.slug }));
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating comic read status:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update comic status' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
