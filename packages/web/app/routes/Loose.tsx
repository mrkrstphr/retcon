import { APP_NAME } from '@retcon/common/constants';
import {
  getLooseComicsCount,
  getLooseComicsForUser,
} from '@retcon/common/db/queries';
import { FaGrinStars } from 'react-icons/fa';
import { Link } from 'react-router';
import { Box } from '~/components/Box';
import { Cover } from '~/components/Cover';
import { NoResults } from '~/components/NoResults';
import { Pagination } from '~/components/Pagination';
import { comicTitle } from '~/lib/comicTitle';
import { generatePageUrl } from '~/lib/generatePageUrl';
import { comicDetailsHref } from '~/lib/links';
import { paginateRecords } from '~/lib/paginateRecords';
import { protectRoute } from '~/lib/protectRoute';
import type { Route } from './+types/Loose';

export function meta() {
  return [
    { title: `Loose Comics - ${APP_NAME}` },
    {
      name: 'description',
      content: 'Browse loose comics',
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await protectRoute(request);

  const {
    records: comics,
    totalRecords: totalComics,
    currentPage,
    totalPages,
  } = await paginateRecords(
    request,
    (limit: number, offset: number) =>
      getLooseComicsForUser(user.id, limit, offset),
    getLooseComicsCount(),
  );

  return { comics, currentPage, totalComics, totalPages };
}

export default function LooseComics({ loaderData }: Route.ComponentProps) {
  const { comics, totalComics, currentPage, totalPages } = loaderData;

  return (
    <div className="flex flex-col gap-2">
      <Box className="p-6">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          Loose Comics
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          The following comics do not have metadata to assign them to a
          publisher and series.
        </p>
      </Box>

      {comics.length > 0 && (
        <Box>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {comics.map((comic) => (
              <Link
                key={comic.id}
                to={comicDetailsHref(comic)}
                className="bg-slate-50 dark:bg-slate-900 rounded-lg no-underline! p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors block"
              >
                <Cover comic={comic} />

                <div className="text-sm text-center mt-2">
                  <div className="font-medium text-slate-900 dark:text-slate-100 mb-1 overflow-hidden">
                    <div className="line-clamp-2 leading-tight">
                      {comicTitle(comic)}
                    </div>
                  </div>
                  {/* Show release date if available */}
                  {comic.metadata?.releaseDate && (
                    <div className="text-xs text-slate-500 dark:text-slate-500 truncate">
                      {comic.metadata.releaseDate}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalRecords={totalComics}
            generatePageUrl={generatePageUrl}
            recordName={totalComics === 1 ? 'comic' : 'comics'}
          />
        </Box>
      )}

      {comics.length === 0 && (
        <NoResults
          icon={FaGrinStars}
          title="No loose comics found!"
          details="You keep a pretty clean house; we admire that."
        />
      )}
    </div>
  );
}
