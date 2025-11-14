import { data, Link } from 'react-router';
import { ButtonAction } from '~/components/ButtonAction';
import { Cover } from '~/components/Cover';
import {
  getSeriesById,
  getSeriesComicCount,
  getSeriesComicsForUser,
  getSeriesReadStatus,
} from '~/db/queries';
import { getUser } from '~/lib/getUser';
import { comicDetailsHref } from '~/lib/links';
import { protectRoute } from '~/lib/protectRoute';
import { idToSqid, sqidToId } from '~/lib/sqids';
import { APP_NAME } from '../constants';
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

export async function loader({ params, request }: Route.LoaderArgs) {
  await protectRoute(request);
  const user = await getUser(request);

  const { sqid } = params;
  const url = new URL(request.url);
  const currentPage = parseInt(url.searchParams.get('page') || '1');
  const itemsPerPage = 25;
  const offset = (currentPage - 1) * itemsPerPage;

  // Get series info with publisher data by ID
  const series = await getSeriesById(sqidToId(sqid));

  if (!series) {
    throw data('Series not found', { status: 404 });
  }

  // Get comics for this series with pagination and read status
  const [comics, totalComics, readStatus] = await Promise.all([
    getSeriesComicsForUser(series.id, user.id, itemsPerPage, offset),
    getSeriesComicCount(series.id),
    // TODO: Re-enable after fixing build issue
    getSeriesReadStatus(series.id, user.id),
  ]);

  const totalPages = Math.ceil(totalComics / itemsPerPage);

  return {
    series,
    comics,
    totalComics,
    currentPage,
    totalPages,
    // TODO: Re-enable after fixing build issue
    readStatus,
  };
}

// Helper function to extract release date from metadata
const getReleaseDate = (metadata: any): Date | null => {
  if (!metadata) return null;

  // Try various metadata fields that might contain release date
  const dateFields = [
    'releaseDate',
    'publicationDate',
    'date',
    'month',
    'year',
  ];

  for (const field of dateFields) {
    if (metadata[field]) {
      const date = new Date(metadata[field]);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  return null;
};

// Helper function to sort comics by release date
const sortComicsByReleaseDate = (comics: any[]) => {
  return comics.sort((a, b) => {
    const dateA = getReleaseDate(a.metadata);
    const dateB = getReleaseDate(b.metadata);

    // If both have dates, sort by date (newest first)
    if (dateA && dateB) {
      return dateB.getTime() - dateA.getTime();
    }

    // If only one has a date, prioritize it
    if (dateA && !dateB) return -1;
    if (!dateA && dateB) return 1;

    // If neither has a date, sort by number then by creation date
    const numA = a.number ? parseInt(a.number) : Infinity;
    const numB = b.number ? parseInt(b.number) : Infinity;

    if (numA !== numB) {
      return numA - numB;
    }

    // Fallback to creation date
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

export default function SeriesDetails({ loaderData }: Route.ComponentProps) {
  const { series, comics, totalComics, currentPage, totalPages, readStatus } =
    loaderData;

  // Sort comics by release date
  const sortedComics = sortComicsByReleaseDate([...comics]);

  // Generate pagination URLs
  const generatePageUrl = (page: number) => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', page.toString());
    return params.toString() ? `?${params.toString()}` : '';
  };

  return (
    <div>
      {/* Header Section */}
      <div className="bg-white dark:bg-slate-950 rounded-lg shadow-md p-8 mb-8">
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
      </div>

      {/* Comics Grid */}
      {sortedComics.length > 0 ? (
        <div className="bg-white dark:bg-slate-950 rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-6">
            Comics {totalPages > 1 && `(Page ${currentPage} of ${totalPages})`}
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {sortedComics.map((comic) => (
              <Link
                key={comic.id}
                to={comicDetailsHref(comic)}
                className="bg-slate-50 dark:bg-slate-900 rounded-lg no-underline! p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors block"
              >
                <Cover comic={comic} />

                <div className="text-sm text-center mt-2">
                  <div className="font-medium text-slate-900 dark:text-slate-100 mb-1 overflow-hidden">
                    <div className="line-clamp-2 leading-tight">
                      {comic.number
                        ? `#${comic.number}`
                        : comic.fileName
                            .split('/')
                            .pop()
                            ?.replace(/\.[^/.]+$/, '') || 'Unknown'}
                    </div>
                  </div>
                  {/* Show release date if available */}
                  {getReleaseDate(comic.metadata) && (
                    <div className="text-xs text-slate-500 dark:text-slate-500 truncate">
                      {getReleaseDate(comic.metadata)!.toLocaleDateString()}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Showing {(currentPage - 1) * 25 + 1} to{' '}
                  {Math.min(currentPage * 25, totalComics)} of {totalComics}{' '}
                  comics
                </div>
                <div className="flex space-x-2">
                  {/* Previous Page */}
                  {currentPage > 1 && (
                    <Link
                      to={generatePageUrl(currentPage - 1)}
                      className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      Previous
                    </Link>
                  )}

                  {/* Page Numbers */}
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Link
                        key={pageNum}
                        to={generatePageUrl(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          pageNum === currentPage
                            ? 'text-white bg-blue-600 hover:bg-blue-700'
                            : 'text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        {pageNum}
                      </Link>
                    );
                  })}

                  {/* Next Page */}
                  {currentPage < totalPages && (
                    <Link
                      to={generatePageUrl(currentPage + 1)}
                      className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      Next
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-950 rounded-lg shadow-md p-8">
          <div className="text-center text-slate-500 dark:text-slate-400">
            <svg
              className="mx-auto h-12 w-12 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
              />
            </svg>
            <p>No comics found in this series</p>
            <p className="text-sm mt-2">
              Comics will appear here once they are scanned and assigned to this
              series
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
