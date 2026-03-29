import { getComicByIdForUser } from '@retcon/common/db/queries';
import { useState } from 'react';
import Markdown from 'react-markdown';
import { Link, useFetcher, useNavigate, useRevalidator } from 'react-router';
import remarkGfm from 'remark-gfm';
import { Box } from '~/components/Box';
import { Cover } from '~/components/Cover';
import { MetadataEditModal } from '~/components/MetadataEditModal';
import { MetadataSearchModal } from '~/components/MetadataSearchModal';
import { SplitButtonDropdown } from '~/components/SplitButtonDropdown';
import { comicTitle } from '~/lib/comicTitle';
import { getUser } from '~/lib/getUser';
import { comicReaderHref, seriesDetailsHref } from '~/lib/links';
import { protectRoute } from '~/lib/protectRoute';
import { idToSqid, sqidToIdOr404 } from '~/lib/sqids';
import type { MetadataSearchResult } from '~/schemas/metadata';
import { APP_NAME } from '../../../common/src/constants';
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

  const id = sqidToIdOr404(params.sqid, 'Comic');
  const comic = await getComicByIdForUser(id, user.id);

  if (!comic) {
    throw new Response('Comic not found', { status: 404 });
  }

  const hasComicVineApiKey = !!process.env.COMICVINE_API_KEY;

  return { comic, hasComicVineApiKey };
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
  const { comic, hasComicVineApiKey } = loaderData;
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editInitialData, setEditInitialData] = useState<any>(undefined);
  const [editMetadataSource, setEditMetadataSource] = useState<{ provider: string; id: string } | undefined>(undefined);

  const displayTitle = comicTitle(comic);

  // Determine if comic has metadata
  const hasMetadata =
    comic.metadata &&
    typeof comic.metadata === 'object' &&
    Object.keys(comic.metadata).length > 0;

  const handleMetadataSuccess = () => {
    // Revalidate to refresh the data
    revalidator.revalidate();
  };

  const handleReadComic = () => {
    navigate(comicReaderHref(comic));
  };

  const handleMarkAsRead = () => {
    fetcher.submit(null, {
      method: 'POST',
      action: `/issue/${idToSqid(comic.id)}/read`,
    });
  };

  const handleMarkAsUnread = () => {
    fetcher.submit(null, {
      method: 'DELETE',
      action: `/issue/${idToSqid(comic.id)}/read`,
    });
  };

  const handleFixMatch = () => {
    setSearchModalOpen(true);
  };

  const handleEditMetadata = () => {
    setEditInitialData(undefined);
    setEditMetadataSource(undefined);
    setEditModalOpen(true);
  };

  const handleSearchApply = (fullMetadata: MetadataSearchResult, originalResult: MetadataSearchResult) => {
    // Convert full ComicVine metadata to edit format
    const editData = {
      series: fullMetadata.series || '',
      number: fullMetadata.number || '',
      volume: fullMetadata.volume || '',
      title: fullMetadata.title || '',
      publisher: fullMetadata.publisher || '',
      summary: fullMetadata.summary || '',
      releaseDate: fullMetadata.releaseDate || '',
      writer: fullMetadata.creators?.writer?.join(', ') || '',
      penciller: fullMetadata.creators?.penciller?.join(', ') || '',
      inker: fullMetadata.creators?.inker?.join(', ') || '',
      colorist: fullMetadata.creators?.colorist?.join(', ') || '',
      letterer: fullMetadata.creators?.letterer?.join(', ') || '',
      coverArtist: fullMetadata.creators?.coverArtist?.join(', ') || '',
      editor: fullMetadata.creators?.editor?.join(', ') || '',
    };

    setEditInitialData(editData);
    setEditMetadataSource({ provider: fullMetadata.provider, id: fullMetadata.id });
    setEditModalOpen(true);
  };

  const primaryLabel =
    comic.currentPage && comic.currentPage > 1 && !comic.isRead
      ? 'Continue Reading'
      : 'Read Comic';

  const dropdownItems = [
    ...(!comic.isRead
      ? [{ label: 'Mark as Read', onClick: handleMarkAsRead }]
      : []),
    ...(comic.currentPage && comic.currentPage > 0
      ? [{ label: 'Mark as Unread', onClick: handleMarkAsUnread }]
      : []),
    {
      label: 'Edit Metadata',
      onClick: handleEditMetadata,
    },
    {
      label: hasMetadata ? 'Fix Match' : 'Find Match',
      onClick: handleFixMatch,
      disabled: !hasComicVineApiKey,
      tooltip: !hasComicVineApiKey
        ? 'ComicVine API not configured.'
        : undefined,
    },
  ];

  return (
    <Box>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 ">
        <div className="lg:col-span-1">
          <Cover comic={comic} />

          <div className="flex justify-center mt-4">
            <SplitButtonDropdown
              primaryLabel={primaryLabel}
              primaryOnClick={handleReadComic}
              items={dropdownItems}
              variant="primary"
            />
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {displayTitle}
            </h2>
            <div className="flex text-slate-600 gap-1 md:gap-0 dark:text-slate-400 mb-2 text-sm flex-col md:flex-row items-start md:items-center md:[&>*+*]:before:content-['·'] md:[&>*+*]:before:inline-block md:[&>*+*]:before:mx-2 md:[&>*+*]:before:text-gray-400 dark:md:[&>*+*]:before:text-gray-600">
              {comic.volume ? <div>{`Volume ${comic.volume}`}</div> : null}
              {comic.seriesId && comic.seriesSlug ? (
                <Link
                  to={seriesDetailsHref({
                    id: comic.seriesId,
                    slug: comic.seriesSlug,
                  })}
                >
                  {comic.series}
                </Link>
              ) : null}
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

      <MetadataSearchModal
        comicId={comic.id}
        comicFileName={comic.fileName}
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onApply={handleSearchApply}
      />

      <MetadataEditModal
        comicId={comic.id}
        comicFileName={comic.fileName}
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditInitialData(undefined);
          setEditMetadataSource(undefined);
        }}
        onSuccess={handleMetadataSuccess}
        initialMetadata={editInitialData}
        metadataSource={editMetadataSource}
      />
    </Box>
  );
}
