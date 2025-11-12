import { LuBookDashed } from 'react-icons/lu';
import { Link } from 'react-router';
import { APP_NAME } from '../constants';
import {
  getPublisherBySlug,
  getPublisherComicCount,
  getPublisherSeriesWithCounts,
} from '../db/queries';

type LoaderData = {
  publisher: {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
  };
  totalComics: number;
  allSeries: {
    id: string;
    name: string;
    slug: string;
    comicCount: number;
  }[];
  series: {
    id: string;
    name: string;
    slug: string;
    comicCount: number;
  }[];
  currentPage: number;
  totalPages: number;
  totalSeries: number;
};

export function meta({ params }: { params: { slug: string } }) {
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
}): Promise<LoaderData> {
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

export default function PublisherDetails({
  loaderData,
}: {
  loaderData: LoaderData;
}) {
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
      {/* Header Section */}
      <div className="bg-white dark:bg-slate-950 rounded-lg shadow-md p-8 mb-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-4">
            {publisher.name}
          </h1>
          <div className="flex flex-col sm:flex-row justify-center gap-6 text-lg">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-4 py-2">
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {totalComics} comic{totalComics !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg px-4 py-2">
              <span className="font-medium text-green-600 dark:text-green-400">
                {totalSeries} series
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Series Table */}
      {series.length > 0 ? (
        <div className="bg-white dark:bg-slate-950 rounded-lg shadow-md overflow-hidden mb-8">
          <div className="p-8 pb-0">
            <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-6">
              Published by {publisher.name}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-8 py-4 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Series Name
                  </th>
                  <th className="px-8 py-4 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Issues
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {series.map((seriesItem, index) => (
                  <tr
                    key={seriesItem.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors ${
                      index % 2 === 0
                        ? 'bg-white dark:bg-slate-950'
                        : 'bg-slate-25 dark:bg-slate-925'
                    }`}
                  >
                    <td className="px-8 py-4 whitespace-nowrap">
                      <Link
                        to={`/series/${seriesItem.slug}`}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium"
                      >
                        {seriesItem.name}
                      </Link>
                    </td>
                    <td className="px-8 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {seriesItem.comicCount} issue
                      {seriesItem.comicCount !== 1 ? 's' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-8 py-6 border-t border-slate-200 dark:border-slate-700">
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
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-950 rounded-lg shadow-md p-8">
          <div className="text-center text-slate-500 dark:text-slate-400">
            <LuBookDashed className="mx-auto h-12 w-12 mb-4" />
            <p>No series found for this publisher</p>
            <p className="text-sm mt-2">
              Series will appear here once comics are scanned
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
