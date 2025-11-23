import { APP_NAME } from '@retcon/common/constants';
import {
  getPublisherBySlug,
  getPublisherComicCount,
  getPublisherSeriesWithCounts,
} from '@retcon/common/db/queries';
import { Link } from 'react-router';
import { Box } from '~/components/Box';
import { Cover } from '~/components/Cover';
import { NoResults } from '~/components/NoResults';
import { integerFormat } from '~/lib/integerFormat';
import { seriesDetailsHref } from '~/lib/links';
import type { Route } from './+types/PublisherDetails';

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Publisher: ${decodeURIComponent(params.slug)} - ${APP_NAME}` },
    {
      name: 'description',
      content: 'View publisher details and series',
    },
  ];
}

export async function loader({
  params,
  request,
}: {
  params: { slug: string };
  request: Request;
}) {
  const publisher = await getPublisherBySlug(params.slug);

  if (!publisher) {
    throw new Response('Publisher not found', { status: 404 });
  }

  // Get URL search params for pagination
  const url = new URL(request.url);
  const currentPage = parseInt(url.searchParams.get('page') || '1');
  const itemsPerPage = 25;

  const [totalComics, allSeries] = await Promise.all([
    getPublisherComicCount(publisher.id),
    getPublisherSeriesWithCounts(publisher.id),
  ]);

  // Calculate pagination
  const totalSeries = allSeries.length;
  const totalPages = Math.ceil(totalSeries / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const series = allSeries.slice(startIndex, startIndex + itemsPerPage);

  return {
    publisher,
    totalComics,
    allSeries,
    series,
    currentPage,
    totalPages,
    totalSeries,
  };
}

export default function PublisherDetails({ loaderData }: Route.ComponentProps) {
  const {
    publisher,
    totalComics,
    series,
    currentPage,
    totalPages,
    totalSeries,
  } = loaderData;

  // Generate pagination URLs
  const generatePageUrl = (page: number) => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', page.toString());
    return params.toString() ? `?${params.toString()}` : '';
  };

  return (
    <div className="flex flex-col gap-2">
      <Box>
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          {publisher.name}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-2">
          Browse your comic collection by {publisher.name}.
        </p>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          This publisher has {integerFormat(totalSeries)} series and{' '}
          {integerFormat(totalComics)} comics in your collection.
        </p>
      </Box>

      {series.length > 0 && (
        <>
          <Box>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {series.map((series) => (
                <Link
                  key={series.id}
                  to={seriesDetailsHref(series)}
                  className="bg-slate-50 dark:bg-slate-900 rounded-lg no-underline! p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors block"
                >
                  {series.firstComicId && (
                    <Cover
                      comic={{
                        id: series.firstComicId,
                        isRead: series.readCount === series.comicCount,
                        pageCount: series.comicCount,
                        currentPage: series.readCount ?? 0,
                      }}
                    />
                  )}

                  <div className="text-sm text-center mt-2">
                    <div className="font-medium text-slate-900 dark:text-slate-100 mb-1 overflow-hidden">
                      <div
                        className="line-clamp-2 leading-tight truncate"
                        title={series.name}
                      >
                        {series.name}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-500 truncate">
                      {series.comicCount} issue
                      {series.comicCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="py-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Showing {(currentPage - 1) * 25 + 1} to{' '}
                    {Math.min(currentPage * 25, totalSeries)} of {totalSeries}{' '}
                    series
                  </div>
                  <div className="flex space-x-2">
                    {/* Previous Page */}
                    {currentPage > 1 && (
                      <Link
                        to={generatePageUrl(currentPage - 1)}
                        className="px-3 py-2 text-sm font-medium no-underline! text-slate-600! dark:text-slate-400! bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700"
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
                          className={`px-3 py-2 text-sm font-medium no-underline! rounded-md ${
                            pageNum === currentPage
                              ? 'text-white! bg-blue-600 hover:bg-blue-700'
                              : 'text-slate-600! dark:text-slate-400! bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
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
                        className="px-3 no-underline! py-2 text-sm font-medium text-slate-600! dark:text-slate-400! bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        Next
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Box>
        </>
      )}

      {series.length === 0 && (
        <NoResults
          title={`No series found for ${publisher.name}`}
          details="Series will appear here once comics are added"
        />
      )}
    </div>
  );
}
