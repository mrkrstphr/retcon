import { useEffect, useRef, useState } from 'react';
import { FaWindowClose } from 'react-icons/fa';
import { useFetcher } from 'react-router';
import { Button } from '~/components/Button';
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
  const [issueCompleteDialogOpen, setIssueCompleteDialogOpen] = useState(false);
  const updateProgress = useProgressUpdater(comic.id);

  useEffect(() => {
    if (readerRef.current) {
      readerRef.current.focus();
    }
  }, []);

  useEffect(() => {
    updateProgress(pageNumber);
  }, [pageNumber]);

  const handleOnClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (issueCompleteDialogOpen) return;

    const { clientX, currentTarget } = e;
    const { left, width } = currentTarget.getBoundingClientRect();
    const clickPosition = clientX - left;

    if (clickPosition < width * 0.4) {
      setPageNumber((prev) => Math.max(prev - 1, 1));
    } else if (clickPosition > width * 0.6) {
      setPageNumber((prev) => Math.min(prev + 1, comic.pageCount));
      if (pageNumber + 1 >= comic.pageCount) {
        setIssueCompleteDialogOpen(true);
      }
    } else {
      setOverlayOpen((open) => !open);
    }
  };

  const handleCloseReader = () => window.history.back();

  const handleKeyboardInput = (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowLeft':
        if (!issueCompleteDialogOpen)
          setPageNumber((prev) => Math.max(prev - 1, 1));
        break;
      case 'ArrowRight':
        if (!issueCompleteDialogOpen) {
          setPageNumber((prev) => Math.min(prev + 1, comic.pageCount));
          if (pageNumber + 1 > comic.pageCount) {
            setIssueCompleteDialogOpen(true);
          }
        }
        break;
      case 'Escape':
        if (issueCompleteDialogOpen) {
          setIssueCompleteDialogOpen(false);
        } else {
          handleCloseReader();
        }
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
      className="flex justify-center items-center select-none relative h-dvh bg-slate-900"
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

      <div
        className={`absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center bg-slate-900/50 transition-opacity duration-500 ease-in-out ${issueCompleteDialogOpen ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="bg-slate-900/80 text-slate-100 p-4 max-w-3/4 md:max-w-[400px]">
          <h3 className="text-xl font-bold mb-2">Issue Complete!</h3>
          <p className="mb-2">You've reached the end of this one!</p>
          <p className="mb-4 text-sm">
            At some point we'll have some suggestions of what to read next
            here...
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setIssueCompleteDialogOpen(false)}
            >
              Close
            </Button>
            <Button onClick={() => window.history.back()}>Exit</Button>
          </div>
        </div>
      </div>

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
