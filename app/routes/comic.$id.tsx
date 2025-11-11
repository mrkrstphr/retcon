import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { APP_NAME } from '../constants';
import { getComicById } from '../db/queries';
import type { Route } from './+types/comic.$id';

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Comic Details - ${APP_NAME}` },
    {
      name: 'description',
      content: 'View comic book details and metadata',
    },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  const comic = await getComicById(params.id);

  if (!comic) {
    throw new Response('Comic not found', { status: 404 });
  }

  return { comic };
}

// Helper function to generate cover image path
const getCoverPath = (id: string) => {
  const subdirectory = id[0].toLowerCase();
  return `/covers/${subdirectory}/${id}.jpg`;
};

function CreatorRow({ label, value }: { label: string; value: string[] }) {
  if (!value || value.length === 0) return null;

  return (
    <div className="border-b border-slate-200 dark:border-slate-700 last:border-b-0 pb-3 last:pb-0">
      <div className="flex flex-col sm:flex-row sm:gap-4">
        <dt className="text-sm font-medium text-slate-600 dark:text-slate-400 sm:w-1/3 mb-1 sm:mb-0">
          {label}
          {value.length > 1 ? 's' : ''}:
        </dt>
        <dd className="text-sm text-slate-900 dark:text-slate-100 sm:w-2/3">
          <pre className="whitespace-pre-wrap font-sans leading-relaxed">
            {value.join(', ')}
          </pre>
        </dd>
      </div>
    </div>
  );
}

function Metadata({ metadata }: { metadata: any }) {
  if (!metadata || typeof metadata !== 'object') return null;

  const hasCreators = [
    'writer',
    'penciller',
    'inker',
    'colorist',
    'letterer',
    'coverArtist',
    'editor',
  ].some((role) => metadata[role] && metadata[role].length > 0);

  return (
    <>
      {metadata?.summary && (
        <div className="prose dark:prose-invert mb-8">
          <Markdown remarkPlugins={[remarkGfm]}>{metadata.summary}</Markdown>
        </div>
      )}

      {hasCreators && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Creators
          </h3>
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-3">
            <CreatorRow label="Writer" value={metadata.writer} />
            <CreatorRow label="Penciller" value={metadata.penciller} />
            <CreatorRow label="Inker" value={metadata.inker} />
            <CreatorRow label="Colorist" value={metadata.colorist} />
            <CreatorRow label="Letterer" value={metadata.letterer} />
            <CreatorRow label="Cover Artist" value={metadata.coverArtist} />
            <CreatorRow label="Editor" value={metadata.editor} />
          </div>
        </div>
      )}
    </>
  );
}

export default function ComicDetails({ loaderData }: Route.ComponentProps) {
  const { comic } = loaderData;

  const displayTitle =
    comic.series && comic.number
      ? `${comic.series} #${comic.number}`
      : comic.fileName
          .split('/')
          .pop()
          ?.replace(/\.[^/.]+$/, '') || comic.fileName;

  const displaySubtitle = [
    comic.volume ? `Volume ${comic.volume}` : null,
    comic.metadata?.releaseDate,
  ]
    .filter(Boolean)
    .join(' - ');

  return (
    <div className="min-h-screen py-16">
      <div className="max-w-6xl mx-auto px-4">
        {/* Back button */}
        <div className="mb-8">
          <a
            href="/"
            className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Collection
          </a>
        </div>

        <div className="bg-white dark:bg-slate-950 rounded-lg shadow-md overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-8">
            {/* Cover Image */}
            <div className="lg:col-span-1">
              <div className="aspect-3/4 bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden shadow-lg">
                <img
                  src={getCoverPath(comic.id)}
                  alt={displayTitle}
                  className="w-full h-full object-cover object-top"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>

            {/* Comic Info */}
            <div className="lg:col-span-2">
              {/* Title Section */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                  {displayTitle}
                </h1>
                {displaySubtitle && (
                  <h2 className="text-lg text-slate-600 dark:text-slate-400 mb-2">
                    {displaySubtitle}
                  </h2>
                )}
                {comic.publisher && (
                  <p className="text-blue-600 dark:text-blue-400 font-medium">
                    {comic.publisher}
                  </p>
                )}
              </div>

              <Metadata metadata={comic.metadata} />

              {/* File Information */}
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  File Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-slate-600 dark:text-slate-400">
                      File Path:
                    </span>
                    <p className="text-slate-900 dark:text-slate-100 break-all mt-1">
                      {comic.fileName}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-slate-600 dark:text-slate-400">
                      Last Modified:
                    </span>
                    <p className="text-slate-900 dark:text-slate-100 mt-1">
                      {new Date(comic.fileModified).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-slate-600 dark:text-slate-400">
                      Last Synced:
                    </span>
                    <p className="text-slate-900 dark:text-slate-100 mt-1">
                      {new Date(comic.lastSynced).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-slate-600 dark:text-slate-400">
                      Comic ID:
                    </span>
                    <p className="text-slate-900 dark:text-slate-100 font-mono text-xs mt-1">
                      {comic.id}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
