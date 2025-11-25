import { APP_NAME } from '@retcon/common/constants';
import {
  getSeriesById,
  getSeriesComicCount,
  getSeriesComicsForUser,
  getSeriesReadStatus,
} from '@retcon/common/db/queries';
import { data, Link } from 'react-router';
import { Box } from '~/components/Box';
import { ButtonAction } from '~/components/ButtonAction';
import { Cover } from '~/components/Cover';
import { NoResults } from '~/components/NoResults';
import { Pagination } from '~/components/Pagination';
import { comicTitle } from '~/lib/comicTitle';
import { generatePageUrl } from '~/lib/generatePageUrl';
import { comicDetailsHref } from '~/lib/links';
import { paginateRecords } from '~/lib/paginateRecords';
import { protectRoute } from '~/lib/protectRoute';
import { idToSqid, sqidToId } from '~/lib/sqids';
import type { Route } from './+types/SeriesDetails';

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) {
    return [{ title: `Series Not Found - ${APP_NAME}` }];
  }

  const { series } = loaderData;
  return [
    { title: `${series.name} - ${APP_NAME}` },
    {
      name: 'description',
      content: `Browse all comics in the ${series.name} series from ${series.publisher}`,
    },
  ];
}

function formatReleaseDate(dateString?: string) {
  if (!dateString) return;

  const date = dateString.length === 7 ? `${dateString}-01` : dateString;
  if (date.length !== 10) return;

  return date;
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const preferredLocale =
    request.headers.get('accept-language')?.split(',')[0] || 'en-US';

  const user = await protectRoute(request);

  const { sqid } = params;

  // Get series info with publisher data by ID
  const series = await getSeriesById(sqidToId(sqid));

  if (!series) {
    throw data('Series not found', { status: 404 });
  }

  const {
    records: comics,
    totalRecords: totalComics,
    currentPage,
    totalPages,
  } = await paginateRecords(
    request,
    (limit: number, offset: number) =>
      getSeriesComicsForUser(series.id, user.id, limit, offset),
    getSeriesComicCount(series.id),
  );

  // Get comics for this series with pagination and read status
  const readStatus = await getSeriesReadStatus(series.id, user.id);

  // we need to format the dates here to prevent a mismatch between the server and client rendering
  const formattedComics = comics.map((comic) => {
    if (comic.metadata?.releaseDate) {
      const formattedReleaseDate = formatReleaseDate(
        comic.metadata.releaseDate,
      );
      return {
        ...comic,
        metadata: {
          ...comic.metadata,
          releaseDate: formattedReleaseDate
            ? new Date(formattedReleaseDate).toLocaleDateString(preferredLocale)
            : undefined,
        },
      };
    }
    return comic;
  });

  return {
    series,
    comics: formattedComics,
    totalComics,
    currentPage,
    totalPages,
    readStatus,
  };
}

export default function SeriesDetails({ loaderData }: Route.ComponentProps) {
  const { series, comics, totalComics, currentPage, totalPages, readStatus } =
    loaderData;

  return (
    <div className="flex flex-col gap-2">
      <Box>
        <div className="text-center">
          <h2 className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-4">
            {series.name}
          </h2>
          <div className="flex flex-col sm:flex-row justify-center gap-6 text-lg">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-4 py-2">
              <span className="text-slate-600 dark:text-slate-400">
                Publisher:{' '}
              </span>
              <Link
                to={`/publishers/${series.publisherSlug}`}
                className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
              >
                {series.publisher}
              </Link>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg px-4 py-2">
              <span className="font-medium text-green-600 dark:text-green-400">
                {totalComics} issue{totalComics !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {readStatus.totalComics > 0 && (
            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
              {!readStatus.allRead && (
                <ButtonAction
                  method="POST"
                  action={`/series/${idToSqid(series.id)}/read`}
                  type="submit"
                  variant="primary"
                >
                  Mark Series as Read
                </ButtonAction>
              )}

              {(!readStatus.noneRead || readStatus.allRead) && (
                <ButtonAction
                  method="DELETE"
                  action={`/series/${idToSqid(series.id)}/read`}
                  type="submit"
                  variant="secondary"
                >
                  Mark Series as Unread
                </ButtonAction>
              )}
            </div>
          )}
        </div>
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
          title="No comics found in this series"
          details="Comics will appear here once they are scanned and assigned to this series"
        />
      )}
    </div>
  );
}
