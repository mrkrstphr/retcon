import { APP_NAME } from '@retcon/common/constants';
import { getComicByIdForUser } from '@retcon/common/db/queries';
import { useEffect, useRef, useState } from 'react';
import { FaWindowClose } from 'react-icons/fa';
import { MdFullscreen, MdFullscreenExit } from 'react-icons/md';
import { useFetcher } from 'react-router';
import { useSwipeable } from 'react-swipeable';
import { Button } from '~/components/Button';
import { OverlayBar } from '~/components/Overlay';
import { ProgressBar } from '~/components/ProgressBar';
import { useEagerUntoggler } from '~/hooks/useEagerUntoggler';
import { useFullScreenManager } from '~/hooks/useFullscreenManager';
import { comicTitle } from '~/lib/comicTitle';
import { comicPageHref } from '~/lib/links';
import { protectRoute } from '~/lib/protectRoute';
import { idToSqid, sqidToIdOr404 } from '~/lib/sqids';
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

export async function loader({ params, request }: Route.LoaderArgs) {
  const { sqid } = params;

  if (!sqid) {
    throw new Response('Missing sqid parameter', { status: 404 });
  }

  const user = await protectRoute(request);

  const id = sqidToIdOr404(sqid, 'Comic');
  const comic = await getComicByIdForUser(id, user.id);

  if (!comic) {
    throw new Response('Comic not found', { status: 404 });
  }

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

const usePageManager = ({
  pageCount,
  currentPage,
}: {
  pageCount: number;
  currentPage?: number | null;
}) => {
  const [pageNumber, setPageNumber] = useState(currentPage ?? 1);

  const nextPage = () => setPageNumber((prev) => Math.min(prev + 1, pageCount));
  const previousPage = () => setPageNumber((prev) => Math.max(prev - 1, 1));

  return { pageNumber, nextPage, previousPage };
};

export default function ComicReader({ loaderData }: Route.ComponentProps) {
  const { comic } = loaderData;
  const readerRef = useRef<HTMLDivElement>(null);
  const { pageNumber, nextPage, previousPage } = usePageManager(comic);
  // open the overlays by default
  // TODO: add user preference for auto closing overlays
  const [overlayOpen, setOverlayOpen] = useEagerUntoggler(true, 1000);
  const [issueCompleteDialogOpen, setIssueCompleteDialogOpen] = useState(false);
  const { isFullscreen, toggleFullscreen } = useFullScreenManager(readerRef);

  const handlers = useSwipeable({
    onSwiped: (eventData) => console.log('User Swiped!', eventData),
    onSwipedLeft: nextPage,
    onSwipedRight: previousPage,
  });
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

    // if click is in less than 40% of the page, go to previous page
    if (clickPosition < width * 0.4) {
      previousPage();
      // if the click is in more than 60% of the page, go to next page
    } else if (clickPosition > width * 0.6) {
      nextPage();
      // if we try to page past the last page, show a completion dialog
      if (pageNumber + 1 >= comic.pageCount) setIssueCompleteDialogOpen(true);
    } else {
      setOverlayOpen((open) => !open);
    }
  };

  const handleCloseReader = (e?: React.MouseEvent<HTMLDivElement>) => {
    e?.stopPropagation();
    window.history.back();
  };

  const handleKeyboardInput = (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowLeft':
        if (!issueCompleteDialogOpen) previousPage();
        break;
      case 'ArrowRight':
        if (!issueCompleteDialogOpen) {
          nextPage();
          if (pageNumber + 1 > comic.pageCount)
            setIssueCompleteDialogOpen(true);
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

  // double the ref, double the fun
  const refPassthrough = (element: HTMLDivElement) => {
    handlers.ref(element);
    readerRef.current = element;
  };

  return (
    <div
      onClick={handleOnClick}
      onKeyDown={handleKeyboardInput}
      onDoubleClick={() => toggleFullscreen()}
      {...handlers}
      tabIndex={0}
      className="flex justify-center items-center relative h-dvh bg-slate-900"
      ref={refPassthrough}
    >
      <OverlayBar
        className="flex items-center gap-4"
        visible={overlayOpen}
        position="top"
      >
        <div className="justify-flex-start ml-2">
          <div className="cursor-pointer" onClick={toggleFullscreen}>
            {isFullscreen ? (
              <MdFullscreenExit size={24} />
            ) : (
              <MdFullscreen size={24} />
            )}
          </div>
        </div>
        <div className="flex-1 text-center truncate select-none">
          {comicTitle(comic)}
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
        className="max-h-screen max-w-full object-contain select-none pointer-events-none"
      />

      {issueCompleteDialogOpen && (
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
      )}

      <OverlayBar visible={overlayOpen} position="bottom">
        <ProgressBar
          className="m-2"
          value={(pageNumber / comic.pageCount) * 100}
        />

        <div className="p-2 text-sm text-center select-none">
          Page {pageNumber} of {comic.pageCount}
        </div>
      </OverlayBar>
    </div>
  );
}
