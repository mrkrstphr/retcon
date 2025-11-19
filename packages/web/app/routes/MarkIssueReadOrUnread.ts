import { redirect } from 'react-router';
import {
  deleteUserComicRecord,
  getComicByIdForUser,
  markComicAsRead,
} from '~/db/queries';
import { comicDetailsHref } from '~/lib/links';
import { protectRoute } from '~/lib/protectRoute';
import { sqidToId } from '~/lib/sqids';
import type { Route } from './+types/MarkIssueReadOrUnread';

async function markIssueRead(
  comic: { id: number; slug: string },
  userId: number,
) {
  await markComicAsRead(userId, comic.id);
  return redirect(comicDetailsHref({ id: comic.id, slug: comic.slug }));
}

async function markIssueUnread(
  comic: { id: number; slug: string },
  userId: number,
) {
  await deleteUserComicRecord(userId, comic.id);
  return redirect(comicDetailsHref({ id: comic.id, slug: comic.slug }));
}

export async function action(args: Route.ActionArgs) {
  const { request, params } = args;

  const user = await protectRoute(request);

  const { sqid } = params;
  const comicId = sqidToId(sqid);

  // Get comic data for redirect
  const comic = await getComicByIdForUser(comicId, user.id);
  if (!comic) {
    throw new Response('Comic not found', { status: 404 });
  }

  try {
    switch (request.method) {
      case 'POST':
        return markIssueRead(comic, user.id);
      case 'DELETE':
        return markIssueUnread(comic, user.id);
      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error(`Error executing ${request.method} handler:`, error);
    return new Response(
      JSON.stringify({ error: 'An unknown error occurred' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
