import { getPublishersWithCounts } from '@retcon/common/db/queries';
import { Link } from 'react-router';
import { Box } from '~/components/Box';
import { NoResults } from '~/components/NoResults';
import { APP_NAME } from '../../../common/src/constants';
import type { Route } from './+types/Publishers';

export function meta() {
  return [
    { title: `Publishers - ${APP_NAME}` },
    {
      name: 'description',
      content: 'Browse comics by publisher',
    },
  ];
}

export async function loader() {
  const publishers = await getPublishersWithCounts();
  return { publishers };
}

// Helper function to get the first letter of a publisher name
const getPublisherInitial = (publisherName: string): string => {
  return publisherName.trim().charAt(0).toUpperCase() || '?';
};

// Helper function to generate a consistent color for each publisher
const getPublisherColor = (publisherName: string): string => {
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-cyan-500',
    'bg-lime-500',
    'bg-rose-500',
  ];

  // Use the first character's char code to consistently assign colors
  const charCode = publisherName.charCodeAt(0) || 0;
  return colors[charCode % colors.length];
};

export default function Publishers({ loaderData }: Route.ComponentProps) {
  const { publishers } = loaderData;
  return (
    <div className="flex flex-col gap-2">
      {/* <PageHeader title="Publishers" /> */}

      {/* Header Section */}
      <Box className="p-6">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          Publishers
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Browse your comic collection by publisher
        </p>
      </Box>

      {/* Publishers Grid */}
      {publishers.length > 0 ? (
        <div className="bg-white dark:bg-slate-950 rounded-lg shadow-md p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {publishers.map(({ publisher, slug, count }) => (
              <Link
                key={publisher}
                to={`/publishers/${slug}`}
                className="group bg-slate-50 no-underline! dark:bg-slate-900 rounded-lg p-6 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200 block"
              >
                {/* Publisher Initial Circle */}
                <div className="flex justify-center mb-4">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl ${getPublisherColor(
                      publisher,
                    )} group-hover:scale-110 transition-transform duration-200`}
                  >
                    {getPublisherInitial(publisher)}
                  </div>
                </div>

                {/* Publisher Info */}
                <div className="text-center">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 line-clamp-2 text-sm leading-tight">
                    {publisher}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    {count} comic{count !== 1 ? 's' : ''}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <NoResults
          title="No publishers found in your comic collection"
          details="Publishers will appear here once you scan your comics"
        />
      )}
    </div>
  );
}
