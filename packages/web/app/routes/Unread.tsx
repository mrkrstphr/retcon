import { APP_NAME } from '@retcon/common/constants';
import { findUnreadSeriesForUser } from '@retcon/common/db/queries';
import { FaAward } from 'react-icons/fa6';
import { PiFileText, PiFiles } from 'react-icons/pi';
import { Form, useSubmit } from 'react-router';
import { Box } from '~/components/Box';
import { ComicList } from '~/components/ComicList';
import { NoResults } from '~/components/NoResults';
import { SeriesList } from '~/components/SeriesList';
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

export async function loader({
  params,
  request,
}: {
  params: { slug: string };
  request: Request;
}) {
  const user = await protectRoute(request);

  const url = new URL(request.url);
  const mode = url.searchParams.get('mode') || 'series';

  if (mode === 'series') {
    const results = await findUnreadSeriesForUser(user.id, '');

    return { mode: 'series', results: results };
  }

  return { mode, results: [] };
}

export default function UnreadPage({ loaderData }: Route.ComponentProps) {
  const { mode, results } = loaderData;

  const submit = useSubmit();

  const handleSwitchView = (newMode: Mode) => () => {
    if (newMode === mode) return;

    const formData = new FormData();
    formData.append('mode', newMode);
    submit(formData, { method: 'get' });
  };

  return (
    <div className="flex flex-col gap-2">
      <Box className="p-6">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          Unread Comics
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          The following comics that you haven't read yet.
        </p>
      </Box>
      <Box>{mode}</Box>
      <Box>
        <Form>
          <span className="isolate inline-flex rounded-md shadow-xs dark:shadow-none">
            <button
              title="View Unread Series"
              type="button"
              className="relative inline-flex items-center rounded-l-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 inset-ring-1 inset-ring-slate-300 hover:bg-slate-50 focus:z-10 dark:bg-white/10 dark:text-white dark:inset-ring-slate-700 dark:hover:bg-white/20"
              onClick={handleSwitchView('series')}
            >
              <PiFiles />
            </button>

            <button
              title="View Individual Unread Comics"
              type="button"
              className="relative -ml-px inline-flex items-center rounded-r-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 inset-ring-1 inset-ring-slate-300 hover:bg-slate-50 focus:z-10 dark:bg-white/10 dark:text-white dark:inset-ring-slate-700 dark:hover:bg-white/20"
              onClick={handleSwitchView('comic')}
            >
              <PiFileText />
            </button>
          </span>
        </Form>
      </Box>

      {results.length > 0 && (
        <Box>
          {mode === 'series' ? (
            <SeriesList series={results} />
          ) : (
            <ComicList comics={results} />
          )}
        </Box>
      )}

      {results.length === 0 && (
        <NoResults
          icon={FaAward}
          title="No unread comics found"
          details="You must be very well read. Maybe you could go revisit some of your favorites?"
        />
      )}
    </div>
  );
}
