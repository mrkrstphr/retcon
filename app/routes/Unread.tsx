import { APP_NAME } from '@retcon/common/constants';
import {
  countUnreadComicsForUser,
  countUnreadSeriesForUser,
  findUnreadComicsForUser,
  findUnreadSeriesForUser,
  getAllPublishers,
} from '@retcon/common/db/queries';
import { FaAward } from 'react-icons/fa6';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { PiFileText, PiFiles } from 'react-icons/pi';
import { Form, Link, useSubmit } from 'react-router';
import { useRef } from 'react';
import { Box } from '~/components/Box';
import { Cover } from '~/components/Cover';
import { NoResults } from '~/components/NoResults';
import { Pagination } from '~/components/Pagination';
import { SeriesList } from '~/components/SeriesList';
import { comicTitle } from '~/lib/comicTitle';
import { comicDetailsHref } from '~/lib/links';
import { paginateRecords } from '~/lib/paginateRecords';
import { protectRoute } from '~/lib/protectRoute';
import type { Route } from './+types/Unread';

type Mode = 'series' | 'comic';

export function meta() {
  return [
    { title: `Unread Comics - ${APP_NAME}` },
    {
      name: 'description',
      content: 'Browse unread comics',
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await protectRoute(request);

  const url = new URL(request.url);
  const mode = url.searchParams.get('mode') || 'series';
  const searchQuery = url.searchParams.get('search') || '';
  const publisherIdStr = url.searchParams.get('publisher') || '';
  const publisherId = publisherIdStr ? parseInt(publisherIdStr) : undefined;

  if (mode === 'series') {
    const [{ records: results, totalRecords, currentPage, totalPages }, allPublishers] =
      await Promise.all([
        paginateRecords(
          request,
          (limit, offset) =>
            findUnreadSeriesForUser(user.id, searchQuery, limit, offset, publisherId),
          countUnreadSeriesForUser(user.id, searchQuery, publisherId),
        ),
        getAllPublishers(),
      ]);

    return {
      mode: 'series' as Mode,
      results,
      totalRecords,
      currentPage,
      totalPages,
      searchQuery,
      publisherId,
      publishers: allPublishers,
    };
  }

  const [{ records: results, totalRecords, currentPage, totalPages }, allPublishers] =
    await Promise.all([
      paginateRecords(
        request,
        (limit, offset) =>
          findUnreadComicsForUser(user.id, searchQuery, limit, offset, publisherId),
        countUnreadComicsForUser(user.id, searchQuery, publisherId),
      ),
      getAllPublishers(),
    ]);

  return {
    mode: 'comic' as Mode,
    results,
    totalRecords,
    currentPage,
    totalPages,
    searchQuery,
    publisherId,
    publishers: allPublishers,
  };
}

export default function UnreadPage({ loaderData }: Route.ComponentProps) {
  const {
    mode,
    results,
    totalRecords,
    currentPage,
    totalPages,
    searchQuery,
    publisherId,
    publishers,
  } = loaderData;

  const submit = useSubmit();
  const formRef = useRef<HTMLFormElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const handleSwitchView = (newMode: Mode) => () => {
    if (newMode === mode) return;
    const formData = new FormData();
    formData.append('mode', newMode);
    if (searchQuery) formData.append('search', searchQuery);
    if (publisherId) formData.append('publisher', publisherId.toString());
    submit(formData, { method: 'get' });
  };

  const handleClearSearch = () => {
    const form = formRef.current;
    if (form) {
      const input = form.querySelector('input[name="search"]') as HTMLInputElement;
      if (input) {
        input.value = '';
        submit(form);
      }
    }
  };

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const form = e.target.form;
    if (form) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => submit(form), 300);
    }
  };

  const handlePublisherChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const form = e.target.form;
    if (form) submit(form);
  };

  const generatePageUrl = (page: number) => {
    const params = new URLSearchParams();
    if (mode !== 'series') params.set('mode', mode);
    if (searchQuery) params.set('search', searchQuery);
    if (publisherId) params.set('publisher', publisherId.toString());
    if (page > 1) params.set('page', page.toString());
    return params.toString() ? `?${params.toString()}` : '';
  };

  const hasFilters = searchQuery || publisherId;

  return (
    <div className="flex flex-col gap-2">
      <Box className="p-6">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          Unread Comics
        </h2>
        <p className="text-slate-600 dark:text-slate-400">Comics you haven't read yet.</p>
      </Box>

      <Box>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <span className="isolate inline-flex rounded-md shadow-xs dark:shadow-none">
            <button
              title="View Unread Series"
              type="button"
              className={`relative inline-flex items-center rounded-l-md px-3 py-2 text-sm font-semibold inset-ring-1 focus:z-10 ${
                mode === 'series'
                  ? 'bg-orange-600 text-white inset-ring-orange-600'
                  : 'bg-white text-slate-900 inset-ring-slate-300 hover:bg-slate-50 dark:bg-white/10 dark:text-white dark:inset-ring-slate-700 dark:hover:bg-white/20'
              }`}
              onClick={handleSwitchView('series')}
            >
              <PiFiles />
            </button>

            <button
              title="View Individual Unread Comics"
              type="button"
              className={`relative -ml-px inline-flex items-center rounded-r-md px-3 py-2 text-sm font-semibold inset-ring-1 focus:z-10 ${
                mode === 'comic'
                  ? 'bg-orange-600 text-white inset-ring-orange-600'
                  : 'bg-white text-slate-900 inset-ring-slate-300 hover:bg-slate-50 dark:bg-white/10 dark:text-white dark:inset-ring-slate-700 dark:hover:bg-white/20'
              }`}
              onClick={handleSwitchView('comic')}
            >
              <PiFileText />
            </button>
          </span>
        </div>
      </Box>

      <Box>
        <Form ref={formRef} method="get">
          <input type="hidden" name="mode" value={mode} />
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </div>
              <input
                type="text"
                name="search"
                placeholder={mode === 'series' ? 'Search series...' : 'Search by series...'}
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

            {publishers.length > 0 && (
              <select
                name="publisher"
                defaultValue={publisherId?.toString() ?? ''}
                onChange={handlePublisherChange}
                className="py-3 px-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">All publishers</option>
                {publishers.map((p) => (
                  <option key={p.id} value={p.id.toString()}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </Form>
      </Box>

      {results.length > 0 && mode === 'series' && (
        <Box>
          <SeriesList series={results as Parameters<typeof SeriesList>[0]['series']} />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalRecords={totalRecords}
            generatePageUrl={generatePageUrl}
            recordName="series"
          />
        </Box>
      )}

      {results.length > 0 && mode === 'comic' && (
        <Box>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {(results as Awaited<ReturnType<typeof findUnreadComicsForUser>>).map((comic) => (
              <Link
                key={comic.id}
                to={comicDetailsHref(comic)}
                className="bg-slate-50 dark:bg-slate-900 rounded-lg no-underline! p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors block"
              >
                <Cover comic={comic} />
                <div className="text-sm text-center mt-2">
                  <div className="font-medium text-slate-900 dark:text-slate-100 mb-1 overflow-hidden">
                    <div className="line-clamp-2 leading-tight" title={comicTitle(comic)}>
                      {comicTitle(comic)}
                    </div>
                  </div>
                  {comic.publisher && (
                    <div className="text-xs text-slate-500 dark:text-slate-500 truncate">
                      {comic.publisher}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalRecords={totalRecords}
            generatePageUrl={generatePageUrl}
            recordName={totalRecords === 1 ? 'comic' : 'comics'}
          />
        </Box>
      )}

      {results.length === 0 && !hasFilters && (
        <NoResults
          icon={FaAward}
          title="No unread comics found"
          details="You must be very well read. Maybe you could go revisit some of your favorites?"
        />
      )}

      {results.length === 0 && hasFilters && (
        <NoResults
          icon={FaSearch}
          title="No results found"
          details="Try adjusting your search or filter."
        />
      )}
    </div>
  );
}
