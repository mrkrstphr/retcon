import Markdown from 'react-markdown';
import { Form, Link } from 'react-router';
import remarkGfm from 'remark-gfm';
import { Box } from '~/components/Box';
import { Button } from '~/components/Button';
import { ButtonLink } from '~/components/ButtonLink';
import { Cover } from '~/components/Cover';
import { getUser } from '~/lib/getUser';
import { comicReaderHref } from '~/lib/links';
import { protectRoute } from '~/lib/protectRoute';
import { idToSqid, sqidToId } from '~/lib/sqids';
import { APP_NAME } from '../constants';
import { getComicByIdForUser } from '../db/queries';
import type { Route } from './+types/ComicDetails';

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    {
      title: `${loaderData.comic.series} #${loaderData.comic.number} - ${APP_NAME}`,
    },
    {
      name: 'description',
      content: 'View comic book details and metadata',
    },
  ];
}

export async function loader({ params, request }: Route.LoaderArgs) {
  await protectRoute(request);
  const user = await getUser(request);

  const id = sqidToId(params.sqid);
  const comic = await getComicByIdForUser(id, user.id);

  if (!comic) {
    throw new Response('Comic not found', { status: 404 });
  }

  return { comic };
}

function formatDate(dateString?: string) {
  if (!dateString) return;

  const date = dateString.length === 7 ? `${dateString}-01` : dateString;
  if (date.length !== 10) return;

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  return new Date(date).toLocaleDateString(undefined, options);
}

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

  return (
    <Box>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 ">
        {/* Cover Image */}
        <div className="lg:col-span-1">
          <Cover comic={comic} />

          <div className="text-center mt-4 space-y-2">
            {/* Primary Read Button */}
            <div>
              <ButtonLink to={comicReaderHref(comic)}>
                {comic.currentPage && comic.currentPage > 1 && !comic.isRead
                  ? 'Continue Reading'
                  : 'Read Comic'}
              </ButtonLink>
            </div>

            {/* Mark as Read Button */}
            {!comic.isRead && (
              <div>
                <Form
                  method="POST"
                  action={`/issue/${idToSqid(comic.id)}/read`}
                >
                  <Button type="submit" variant="secondary">
                    Mark as Read
                  </Button>
                </Form>
              </div>
            )}

            {/* Mark as Unread Button */}
            {comic.currentPage && comic.currentPage > 0 && (
              <div>
                <Form
                  method="DELETE"
                  action={`/issue/${idToSqid(comic.id)}/read`}
                >
                  <Button type="submit" variant="secondary">
                    Mark as Unread
                  </Button>
                </Form>
              </div>
            )}
          </div>
        </div>

        {/* Comic Info */}
        <div className="lg:col-span-2">
          {/* Title Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {displayTitle}
            </h2>
            <div className="flex text-slate-600 gap-1 md:gap-0 dark:text-slate-400 mb-2 text-sm flex-col md:flex-row items-start md:items-center md:[&>*+*]:before:content-['·'] md:[&>*+*]:before:inline-block md:[&>*+*]:before:mx-2 md:[&>*+*]:before:text-gray-400 dark:md:[&>*+*]:before:text-gray-600">
              {comic.volume ? <div>{`Volume ${comic.volume}`}</div> : null}
              {comic.publisher ? (
                <span>
                  <Link to={`/publishers/${comic.publisherSlug}`}>
                    {comic.publisher}
                  </Link>
                </span>
              ) : null}
              {comic.metadata?.releaseDate ? (
                <div>{formatDate(comic.metadata?.releaseDate)}</div>
              ) : null}
            </div>
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
    </Box>
  );
}
