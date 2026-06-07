import { APP_NAME } from '@retcon/common/constants';
import {
  getLooseComicsCount,
  getLooseComicsForUser,
} from '@retcon/common/db/queries';
import type { MetadataSearchResult } from '~/schemas/metadata';
import { useState } from 'react';
import { FaGrinStars } from 'react-icons/fa';
import { MdSearch } from 'react-icons/md';
import { Link, useRevalidator } from 'react-router';
import { Box } from '~/components/Box';
import { Cover } from '~/components/Cover';
import { MetadataEditModal } from '~/components/MetadataEditModal';
import { MetadataSearchModal } from '~/components/MetadataSearchModal';
import { NoResults } from '~/components/NoResults';
import { Pagination } from '~/components/Pagination';
import { comicTitle } from '~/lib/comicTitle';
import { generatePageUrl } from '~/lib/generatePageUrl';
import { comicDetailsHref } from '~/lib/links';
import { paginateRecords } from '~/lib/paginateRecords';
import { protectRoute } from '~/lib/protectRoute';
import type { Route } from './+types/Loose';

export function meta() {
  return [
    { title: `Loose Comics - ${APP_NAME}` },
    {
      name: 'description',
      content: 'Browse loose comics',
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await protectRoute(request);

  const {
    records: comics,
    totalRecords: totalComics,
    currentPage,
    totalPages,
  } = await paginateRecords(
    request,
    (limit: number, offset: number) =>
      getLooseComicsForUser(user.id, limit, offset),
    getLooseComicsCount(),
  );

  const hasComicVineApiKey = !!process.env.COMICVINE_API_KEY;

  return { comics, currentPage, totalComics, totalPages, hasComicVineApiKey };
}

export default function LooseComics({ loaderData }: Route.ComponentProps) {
  const { comics, totalComics, currentPage, totalPages, hasComicVineApiKey } =
    loaderData;
  const revalidator = useRevalidator();
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [selectedComicId, setSelectedComicId] = useState<number | null>(null);
  const [selectedComicFileName, setSelectedComicFileName] = useState<
    string | null
  >(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editInitialData, setEditInitialData] = useState<any>(undefined);
  const [editMetadataSource, setEditMetadataSource] = useState<{ provider: string; id: string } | undefined>(undefined);

  const handleSearchClick = (comicId: number, fileName: string) => {
    if (!hasComicVineApiKey) return;
    setSelectedComicId(comicId);
    setSelectedComicFileName(fileName);
    setSearchModalOpen(true);
  };

  const handleModalClose = () => {
    setSearchModalOpen(false);
    setSelectedComicId(null);
    setSelectedComicFileName(null);
  };

  const handleSearchApply = (fullMetadata: MetadataSearchResult, originalResult: MetadataSearchResult) => {
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

  const handleEditSuccess = () => {
    revalidator.revalidate();
  };

  return (
    <div className="flex flex-col gap-2">
      <Box className="p-6">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          Loose Comics
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          The following comics do not have metadata to assign them to a
          publisher and series.
        </p>
      </Box>

      {comics.length > 0 && (
        <Box>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {comics.map((comic) => (
              <div key={comic.id} className="relative group">
                <Link
                  to={comicDetailsHref(comic)}
                  className="bg-slate-50 dark:bg-slate-900 rounded-lg no-underline! p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors block"
                >
                  <Cover comic={comic} />

                  <div className="text-sm text-center mt-2">
                    <div className="font-medium text-slate-900 dark:text-slate-100 mb-1 overflow-hidden">
                      <div className="line-clamp-2 leading-tight">
                        {comicTitle(comic)}
                      </div>
                    </div>
                    {comic.metadata?.releaseDate && (
                      <div className="text-xs text-slate-500 dark:text-slate-500 truncate">
                        {comic.metadata.releaseDate}
                      </div>
                    )}
                  </div>
                </Link>

                <div
                  className="absolute top-3 right-3"
                  title={
                    hasComicVineApiKey
                      ? 'Search for metadata'
                      : 'ComicVine API not configured.'
                  }
                >
                  <button
                    onClick={() => handleSearchClick(comic.id, comic.fileName)}
                    disabled={!hasComicVineApiKey}
                    className={`rounded-full p-2 shadow-md transition-all ${
                      hasComicVineApiKey
                        ? 'bg-orange-600/80 hover:bg-orange-600 hover:shadow-lg text-white cursor-pointer'
                        : 'bg-gray-400/60 dark:bg-gray-600/60 text-gray-300 dark:text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <MdSearch className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalRecords={totalComics}
            generatePageUrl={generatePageUrl}
            recordName={totalComics === 1 ? 'comic' : 'comics'}
          />
        </Box>
      )}

      {comics.length === 0 && (
        <NoResults
          icon={FaGrinStars}
          title="No loose comics found!"
          details="You keep a pretty clean house; we admire that."
        />
      )}

      {selectedComicId && selectedComicFileName && (
        <MetadataSearchModal
          comicId={selectedComicId}
          comicFileName={selectedComicFileName}
          isOpen={searchModalOpen}
          onClose={handleModalClose}
          onApply={handleSearchApply}
        />
      )}

      {selectedComicId && selectedComicFileName && (
        <MetadataEditModal
          comicId={selectedComicId}
          comicFileName={selectedComicFileName}
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditInitialData(undefined);
            setEditMetadataSource(undefined);
          }}
          onSuccess={handleEditSuccess}
          initialMetadata={editInitialData}
          metadataSource={editMetadataSource}
        />
      )}
    </div>
  );
}
