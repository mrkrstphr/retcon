import { deleteUserSeriesRecords, markSeriesAsRead } from '~/db/queries';
import { getUser } from '~/lib/getUser';
import { protectRoute } from '~/lib/protectRoute';
import { sqidToId } from '~/lib/sqids';
import type { Route } from './+types/MarkSeriesReadOrUnread';

export async function action({ request, params }: Route.ActionArgs) {
  await protectRoute(request);
  const user = await getUser(request);

  const { sqid } = params;
  const seriesId = sqidToId(sqid);

  try {
    if (request.method === 'POST') {
      // Mark entire series as read
      await markSeriesAsRead(user.id, seriesId);
      return new Response(
        JSON.stringify({ success: true, action: 'series_marked_read' }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );
    } else if (request.method === 'DELETE') {
      // Delete all user_comic records for the series
      await deleteUserSeriesRecords(user.id, seriesId);
      return new Response(
        JSON.stringify({ success: true, action: 'series_records_deleted' }),
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
    console.error('Error updating series read status:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update series status' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
