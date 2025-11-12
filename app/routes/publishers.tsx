import { Link } from 'react-router';
import { APP_NAME } from '../constants';
import { getPublishersWithCounts } from '../db/queries';

type PublisherData = {
  publisher: string;
  slug: string;
  count: number;
};

type LoaderData = {
  publishers: PublisherData[];
};

export function meta() {
  return [
    { title: `Publishers - ${APP_NAME}` },
    {
      name: 'description',
      content: 'Browse comics by publisher',
    },
  ];
}

export async function loader(): Promise<LoaderData> {
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

export default function Publishers({ loaderData }: { loaderData: LoaderData }) {
  const { publishers } = loaderData;
  return (
    <div>
      {/* Header Section */}
      <div className="bg-white dark:bg-slate-950 rounded-lg shadow-md text-center p-8 mb-8">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          Publishers
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Browse your comic collection by publisher
        </p>
      </div>

      {/* Publishers Grid */}
      {publishers.length > 0 ? (
        <div className="bg-white dark:bg-slate-950 rounded-lg shadow-md p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {publishers.map(({ publisher, slug, count }: PublisherData) => (
              <Link
                key={publisher}
                to={`/publishers/${slug}`}
                className="group bg-slate-50 no-underline! dark:bg-slate-900 rounded-lg p-6 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200 no-underline block"
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
            <p>No publishers found in your comic collection</p>
            <p className="text-sm mt-2">
              Publishers will appear here once you scan your comics
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
