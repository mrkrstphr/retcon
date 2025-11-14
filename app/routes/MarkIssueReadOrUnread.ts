import { deleteUserComicRecord, markComicAsRead } from '~/db/queries';
import { getUser } from '~/lib/getUser';
import { protectRoute } from '~/lib/protectRoute';
import { sqidToId } from '~/lib/sqids';
import type { Route } from './+types/MarkIssueReadOrUnread';

export async function action({ request, params }: Route.ActionArgs) {
  await protectRoute(request);
  const user = await getUser(request);

  const { sqid } = params;
  const comicId = sqidToId(sqid);

  try {
    if (request.method === 'POST') {
      // Mark comic as read
      await markComicAsRead(user.id, comicId);
      return new Response(
        JSON.stringify({ success: true, action: 'marked_read' }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );
    } else if (request.method === 'DELETE') {
      // Delete user_comic record (unmark/remove from reading list)
      await deleteUserComicRecord(user.id, comicId);
      return new Response(
        JSON.stringify({ success: true, action: 'deleted_record' }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );
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
