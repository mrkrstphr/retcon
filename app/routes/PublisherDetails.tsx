import { APP_NAME } from '@retcon/common/constants';
import {
  getPublisherBySlug,
  getPublisherComicCount,
  getPublisherSeriesCount,
  getPublisherSeriesWithCounts,
} from '@retcon/common/db/queries';
import { useRef } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { Form, useSubmit } from 'react-router';
import { Box } from '~/components/Box';
import { NoResults } from '~/components/NoResults';
import { Pagination } from '~/components/Pagination';
import { SeriesList } from '~/components/SeriesList';
import { integerFormat } from '~/lib/integerFormat';
import { paginateRecords } from '~/lib/paginateRecords';
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
  const url = new URL(request.url);
  const searchQuery = url.searchParams.get('search') || '';

  const publisher = await getPublisherBySlug(params.slug);

  if (!publisher) {
    throw new Response('Publisher not found', { status: 404 });
  }

  const [
    { records: series, totalRecords: totalSeries, currentPage, totalPages },
    totalComics,
  ] = await Promise.all([
    paginateRecords(
      request,
      (limit: number, offset: number) =>
        getPublisherSeriesWithCounts(
          publisher.id,
          searchQuery,
          undefined,
          limit,
          offset,
        ),
      getPublisherSeriesCount(publisher.id, searchQuery),
    ),
    getPublisherComicCount(publisher.id),
  ]);

  return {
    publisher,
    totalComics,
    series,
    currentPage,
    totalPages,
    totalSeries,
    searchQuery,
  };
}

export default function PublisherDetails({ loaderData }: Route.ComponentProps) {
  const {
    publisher,
    // how many total comics by the publisher
    totalComics,
    series,
    currentPage,
    totalPages,
    // how many total series by the publisher
    totalSeries,
    searchQuery,
  } = loaderData;

  const submit = useSubmit();
  const formRef = useRef<HTMLFormElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const handleClearSearch = () => {
    const form = formRef.current;
    if (form) {
      const input = form.querySelector(
        'input[name="search"]',
      ) as HTMLInputElement;
      if (input) {
        input.value = '';
        submit(form);
      }
    }
  };

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const form = e.target.form;
    if (form) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        submit(form);
      }, 300);
    }
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

      {(series.length > 0 || searchQuery) && (
        <Box>
          <Form ref={formRef} method="get" className="">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                </div>
                <input
                  type="text"
                  name="search"
                  placeholder="Search series..."
                  defaultValue={searchQuery}
                  onChange={handleSearchInput}
                  className="w-full pl-10 pr-10 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    aria-label="Clear search"
                  >
                    <FaTimes className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </Form>
        </Box>
      )}

      {series.length > 0 && (
        <>
          <Box>
            <SeriesList series={series} />

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalRecords={totalSeries}
              generatePageUrl={(page: number) => {
                const params = new URLSearchParams();
                if (searchQuery) params.set('search', searchQuery);
                if (page > 1) params.set('page', page.toString());
                return params.toString() ? `?${params.toString()}` : '';
              }}
              recordName="series"
            />
          </Box>
        </>
      )}

      {!searchQuery && series.length === 0 && (
        <NoResults
          title={`No series found for ${publisher.name}`}
          details="Series will appear here once comics are added"
        />
      )}

      {searchQuery && series.length === 0 && (
        <NoResults
          title="No series found"
          details={`No series matching "${searchQuery}" found for ${publisher.name}`}
        />
      )}
    </div>
  );
}
