import {
  getInProgressComics,
  getRecentComicsForUser,
} from '@retcon/common/db/queries';
import { Link } from 'react-router';
import { Box } from '~/components/Box';
import { Cover } from '~/components/Cover';
import { NoResults } from '~/components/NoResults';
import { comicTitle } from '~/lib/comicTitle';
import { comicDetailsHref, comicReaderHref } from '~/lib/links';
import { protectRoute } from '~/lib/protectRoute';
import { APP_NAME } from '@retcon/common/constants';
import type { Route } from './+types/Home';

export function meta({}: Route.MetaArgs) {
  return [
    { title: `${APP_NAME} - Home` },
    {
      name: 'description',
      content: 'Organize and browse your comic book collection',
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await protectRoute(request);

  const [recentComics, inProgressComics] = await Promise.all([
    getRecentComicsForUser(user.id, 10),
    getInProgressComics(user.id, 10),
  ]);

  return {
    recentComics,
    inProgressComics,
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { recentComics, inProgressComics } = loaderData;

  return (
    <div className="flex flex-col gap-2">
      {inProgressComics.length > 0 && (
        <Box>
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-6">
            Continue Reading
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {inProgressComics.map((comic) => (
              <div
                key={comic.id}
                className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2 transition-colors"
              >
                <Link
                  to={comicReaderHref(comic)}
                  className="aspect-3/4 mb-3 bg-slate-200 dark:bg-slate-700 rounded relative block hover:opacity-90 transition-opacity no-underline!"
                >
                  <Cover comic={comic} />
                </Link>
                <Link
                  to={comicDetailsHref(comic)}
                  className="text-sm text-center block hover:bg-slate-100 dark:hover:bg-slate-800 rounded px-1 py-1 transition-colors no-underline!"
                >
                  <div className="font-medium text-slate-900 dark:text-slate-100 mb-1 overflow-hidden">
                    <div className="line-clamp-2 leading-tight">
                      {comicTitle(comic)}
                    </div>
                  </div>
                  {comic.publisher && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                      {comic.publisher}
                    </div>
                  )}
                </Link>
              </div>
            ))}
          </div>
        </Box>
      )}

      {recentComics.length > 0 && (
        <Box>
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-6">
            Recently Added
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {recentComics.map((comic) => (
              <Link
                key={comic.id}
                to={comicDetailsHref(comic)}
                className="bg-slate-50 dark:bg-slate-900 rounded-lg no-underline! p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors block"
              >
                <div className="aspect-3/4 mb-3 bg-slate-200 dark:bg-slate-700 rounded relative">
                  <Cover comic={comic} />
                </div>
                <div className="text-sm text-center">
                  <div className="font-medium text-slate-900 dark:text-slate-100 mb-1 overflow-hidden">
                    <div className="line-clamp-2 leading-tight">
                      {comicTitle(comic)}
                    </div>
                  </div>
                  {comic.publisher && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                      {comic.publisher}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </Box>
      )}

      {recentComics.length === 0 && inProgressComics.length === 0 && (
        <Box>
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-6">
            Welcome to {APP_NAME}!
          </h2>
          <NoResults
            title="No comics found in your collection"
            details="Comics will appear here once you scan your collection"
          />
        </Box>
      )}
    </div>
  );
}
