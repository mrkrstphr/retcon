import { redirect } from 'react-router';
import {
  deleteUserSeriesRecords,
  getSeriesById,
  markSeriesAsRead,
} from '~/db/queries';
import { getUser } from '~/lib/getUser';
import { seriesDetailsHref } from '~/lib/links';
import { protectRoute } from '~/lib/protectRoute';
import { sqidToId } from '~/lib/sqids';
import type { Route } from './+types/MarkSeriesReadOrUnread';

export async function action({ request, params }: Route.ActionArgs) {
  await protectRoute(request);
  const user = await getUser(request);

  const { sqid } = params;
  const seriesId = sqidToId(sqid);

  // Get series data for redirect
  const series = await getSeriesById(seriesId);
  if (!series) {
    throw new Response('Series not found', { status: 404 });
  }

  try {
    if (request.method === 'POST') {
      // Mark entire series as read
      await markSeriesAsRead(user.id, seriesId);
      return redirect(seriesDetailsHref({ id: series.id, slug: series.slug }));
    } else if (request.method === 'DELETE') {
      // Delete all user_comic records for the series
      await deleteUserSeriesRecords(user.id, seriesId);
      return redirect(seriesDetailsHref({ id: series.id, slug: series.slug }));
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
