import { useEffect, useRef, useState } from 'react';
import { FaWindowClose } from 'react-icons/fa';
import { useFetcher } from 'react-router';
import { OverlayBar } from '~/components/Overlay';
import { APP_NAME } from '~/constants';
import { getComicById } from '~/db/queries';
import { useEagerUntoggler } from '~/hooks/useEagerUntoggler';
import { comicPageHref } from '~/lib/links';
import { idToSqid, sqidToId } from '~/lib/sqids';
import type { Route } from './+types/ComicReader';

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    {
      title: `Reading ${loaderData.comic.series} #${loaderData.comic.number} - ${APP_NAME}`,
    },
    {
      name: 'description',
      content: 'Read the comic book in a full-screen reader',
    },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  const { sqid } = params;

  if (!sqid) {
    throw new Response('Missing sqid parameter', { status: 404 });
  }

  const id = sqidToId(sqid);
  const comic = await getComicById(id);

  return { comic };
}

const useProgressUpdater = (comicId: number) => {
  const fetcher = useFetcher();

  const updateProgress = (currentPage: number) => {
    fetcher.submit(
      { currentPage },
      {
        method: 'POST',
        action: `/comic/${idToSqid(comicId)}/progress`,
        encType: 'application/json',
      },
    );
  };

  return updateProgress;
};

export default function ComicReader({ loaderData }: Route.ComponentProps) {
  const { comic } = loaderData;
  const readerRef = useRef<HTMLDivElement>(null);
  const [pageNumber, setPageNumber] = useState(comic.currentPage ?? 1);
  const [overlayOpen, setOverlayOpen] = useEagerUntoggler(false, 3000);
  const updateProgress = useProgressUpdater(comic.id);

  const overlayDismissRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (readerRef.current) {
      readerRef.current.focus();
    }
  }, []);

  useEffect(() => {
    updateProgress(pageNumber);
  }, [pageNumber]);

  const handleOnClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, currentTarget } = e;
    const { left, width } = currentTarget.getBoundingClientRect();
    const clickPosition = clientX - left;

    if (clickPosition < width * 0.4) {
      setPageNumber((prev) => Math.max(prev - 1, 1));
    } else if (clickPosition > width * 0.6) {
      setPageNumber((prev) => Math.min(prev + 1, comic.pageCount));
    } else {
      setOverlayOpen((open) => !open);
    }
  };

  const handleCloseReader = () => window.history.back();

  const handleKeyboardInput = (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowLeft':
        setPageNumber((prev) => Math.max(prev - 1, 1));
        break;
      case 'ArrowRight':
        setPageNumber((prev) => Math.min(prev + 1, comic.pageCount));
        break;
      case 'Escape':
        handleCloseReader();
        break;
      default:
        break;
    }
  };

  return (
    <div
      onClick={handleOnClick}
      onKeyDown={handleKeyboardInput}
      tabIndex={0}
      className="flex justify-center items-center select-none relative h-dvh"
      ref={readerRef}
    >
      <OverlayBar
        className="flex items-center gap-2"
        visible={overlayOpen}
        position="top"
      >
        <div className="flex-1 text-center">
          {comic.series} {comic.number ? `#${comic.number}` : ''}
        </div>
        <div
          className="cursor-pointer justify-self-end mr-2"
          onClick={handleCloseReader}
        >
          <FaWindowClose />
        </div>
      </OverlayBar>
      <img
        src={comicPageHref(comic, pageNumber)}
        className="max-h-screen max-w-full object-contain pointer-events-none"
      />
      <OverlayBar visible={overlayOpen} position="bottom">
        <div className="relative m-2">
          <div className="bg-slate-500/40 h-1 w-full absolute top-0 left-0 z-0" />
          <div
            className="bg-slate-500 h-1 w-full absolute top-0 left-0 z-10 transition-[width] duration-500 ease-in-out"
            style={{ width: `${(pageNumber / comic.pageCount) * 100}%` }}
          />
        </div>
        <div className="p-2 text-sm text-center">
          Page {pageNumber} of {comic.pageCount}
        </div>
      </OverlayBar>
    </div>
  );
}
