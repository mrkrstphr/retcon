import { getChangelog } from '~/services/changelog.server';
import { protectRoute } from '~/lib/protectRoute';
import type { Route } from './+types/Changelog';

export async function loader({ request }: Route.LoaderArgs) {
  await protectRoute(request);
  const result = await getChangelog();
  return Response.json(result);
}
