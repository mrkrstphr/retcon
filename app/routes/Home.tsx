import { Link } from 'react-router';
import { Box } from '~/components/Box';
import { Cover } from '~/components/Cover';
import { getUser } from '~/lib/getUser';
import { comicDetailsHref, comicReaderHref } from '~/lib/links';
import { protectRoute } from '~/lib/protectRoute';
import { APP_NAME } from '../constants';
import {
  getInProgressComics,
  getRecentComics,
  getSearchCount,
  searchComics,
} from '../db/queries';
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
  await protectRoute(request);
  const user = await getUser(request);

  const [recentComics, inProgressComics] = await Promise.all([
    getRecentComics(10),
    getInProgressComics(user.id, 10),
  ]);

  return {
    recentComics,
    inProgressComics,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const searchTerm = formData.get('search') as string;
  const offset = parseInt((formData.get('offset') as string) || '0');
  const limit = 25;

  if (!searchTerm || searchTerm.trim() === '') {
    return {
      searchResults: [],
      searchTerm: '',
      hasMore: false,
      offset: 0,
      totalCount: 0,
    };
  }

  const [searchResults, totalCount] = await Promise.all([
    searchComics(searchTerm.trim(), limit, offset),
    offset === 0 ? getSearchCount(searchTerm.trim()) : Promise.resolve(0), // Only get count on first page
  ]);

  const hasMore = searchResults.length === limit; // If we get full page, there might be more

  return {
    searchResults,
    searchTerm: searchTerm.trim(),
    hasMore,
    offset,
    totalCount,
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
              <Link
                key={comic.id}
                to={comicReaderHref(comic)}
                className="bg-slate-50 dark:bg-slate-900 rounded-lg no-underline! p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors block"
              >
                <div className="aspect-3/4 mb-3 bg-slate-200 dark:bg-slate-700 rounded relative">
                  <Cover comic={comic} />
                </div>
                <div className="text-sm text-center">
                  <div className="font-medium text-slate-900 dark:text-slate-100 mb-1 overflow-hidden">
                    <div className="line-clamp-2 leading-tight">
                      {comic.series && comic.number
                        ? `${comic.series} #${comic.number}`
                        : comic.fileName
                            .split('/')
                            .pop()
                            ?.replace(/\.[^/.]+$/, '') || comic.fileName}
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
                      {comic.series && comic.number
                        ? `${comic.series} #${comic.number}`
                        : comic.fileName
                            .split('/')
                            .pop()
                            ?.replace(/\.[^/.]+$/, '') || comic.fileName}
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
    </div>
  );
}
