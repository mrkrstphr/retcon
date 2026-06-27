import { upsertUserComicRating } from '@retcon/common/db/queries';
import { protectRoute } from '~/lib/protectRoute';
import { sqidToIdOr404 } from '~/lib/sqids';
import type { Route } from './+types/IssueRating';

function isValidRating(r: unknown): r is number {
  if (typeof r !== 'number') return false;
  if (r < 0.25 || r > 5) return false;
  return Math.round(r * 4) === r * 4;
}

export const action = async ({ params, request }: Route.ActionArgs) => {
  const user = await protectRoute(request);
  const id = sqidToIdOr404(params.sqid, 'Comic');

  const body = await request.json();
  const { rating } = body as { rating: unknown };

  if (rating !== null && !isValidRating(rating)) {
    return new Response('Invalid rating', { status: 400 });
  }

  await upsertUserComicRating(user.id, id, rating as number | null);
  return new Response('OK');
};
