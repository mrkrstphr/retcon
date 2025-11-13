import { GiBookshelf, GiWhiteBook } from 'react-icons/gi';
import { Link } from 'react-router';
import { NoResults } from '~/components/NoResults';
import { PageHeader } from '~/components/PageHeader';
import { integerFormat } from '~/lib/integerFormat';
import { sqids } from '~/lib/sqids';
import { APP_NAME } from '../constants';
import {
  getPublisherBySlug,
  getPublisherComicCount,
  getPublisherSeriesWithCounts,
} from '../db/queries';
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
    <div>
      <PageHeader
        title={publisher.name}
        attributes={[
          {
            label: `${integerFormat(totalSeries)} series`,
            icon: GiBookshelf,
          },
          {
            label: `${integerFormat(totalComics)} comic${totalComics !== 1 ? 's' : ''}`,
            icon: GiWhiteBook,
          },
        ]}
      />

      {series.length > 0 && (
        <>
          <div className="">
            <div className="sm:flex sm:items-center">
              <div className="sm:flex-auto">
                <h1 className="text-base font-semibold text-slate-900 dark:text-white">
                  Comic Series Published by {publisher.name}
                </h1>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                  The following series are published by {publisher.name}.
                </p>
              </div>
              <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                {/* Future actions area */}
              </div>
            </div>
            <div className="mt-4 flow-root">
              <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                  <table className="relative min-w-full divide-y divide-slate-300 dark:divide-white/15">
                    <thead>
                      <tr>
                        <th
                          scope="col"
                          className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-slate-900 sm:pl-3 dark:text-white"
                        >
                          Series Name
                        </th>
                        <th
                          scope="col"
                          className="py-3.5 pr-4 pl-3 sm:pr-3 text-right text-sm font-semibold text-slate-900 dark:text-white"
                        >
                          # Issues
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900">
                      {/* {people.map((person) => (
                  <tr key={person.email} className="even:bg-slate-50 dark:even:bg-slate-800/50">
                    <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-slate-900 sm:pl-3 dark:text-white">
                      {person.name}
                    </td>
                    <td className="px-3 py-4 text-sm whitespace-nowrap text-slate-500 dark:text-slate-400">
                      {person.title}
                    </td>
                    <td className="px-3 py-4 text-sm whitespace-nowrap text-slate-500 dark:text-slate-400">
                      {person.email}
                    </td>
                    <td className="px-3 py-4 text-sm whitespace-nowrap text-slate-500 dark:text-slate-400">
                      {person.role}
                    </td>
                    <td className="py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-3">
                      <a
                        href="#"
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        Edit<span className="sr-only">, {person.name}</span>
                      </a>
                    </td>
                  </tr>
                ))} */}

                      {series.map((seriesItem) => (
                        <tr
                          key={`series-${seriesItem.name}-${seriesItem.id}`}
                          className="even:bg-slate-50 dark:even:bg-slate-800/50 "
                        >
                          <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-slate-900 sm:pl-3 dark:text-white">
                            <Link
                              to={`/series/${sqids.encode([seriesItem.id])}/${seriesItem.slug}`}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium"
                            >
                              {seriesItem.name}
                            </Link>
                          </td>
                          <td className="py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-3">
                            {seriesItem.comicCount} issue
                            {seriesItem.comicCount !== 1 ? 's' : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="py-6 border-t border-slate-200 dark:border-slate-700">
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
        </>
      )}

      {series.length === 0 && (
        <NoResults
          title={`No series found for ${publisher.name}`}
          details="Series will appear here once comics are scanned"
        />
      )}
    </div>
  );
}
