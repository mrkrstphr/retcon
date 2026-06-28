import { APP_NAME } from '@retcon/common/constants';
import { getComicByIdForUser, getNextComicInSeries } from '@retcon/common/db/queries';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FaWindowClose } from 'react-icons/fa';
import { MdFullscreen, MdFullscreenExit, MdGridView, MdMoreVert } from 'react-icons/md';
import { Link, useFetcher, useLocation, useNavigate } from 'react-router';
import { useSwipeable } from 'react-swipeable';
import { Button } from '~/components/Button';
import { OverlayBar } from '~/components/Overlay';
import { PageThumbnailGrid } from '~/components/PageThumbnailGrid';
import { ProgressBar } from '~/components/ProgressBar';

import { useFullScreenManager } from '~/hooks/useFullscreenManager';
import { usePageManager } from '~/hooks/usePageManager';
import { comicTitle } from '~/lib/comicTitle';
import { getCoverPath } from '~/lib/getCoverPath';
import { comicPageHref, comicReaderHref, isInAppPath, seriesDetailsHref } from '~/lib/links';
import type { ReaderLocationState } from '~/lib/links';
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

  const nextComic = comic.seriesId
    ? await getNextComicInSeries(comic.seriesId, comic.id, user.id)
    : null;

  return { comic, nextComic };
}

const useProgressUpdater = (comicId: number) => {
  const fetcher = useFetcher();
  const submitRef = useRef(fetcher.submit);
  submitRef.current = fetcher.submit;

  const updateProgress = useCallback(
    (currentPage: number) => {
      submitRef.current(
        { currentPage },
        {
          method: 'POST',
          action: `/comic/${idToSqid(comicId)}/progress`,
          encType: 'application/json',
        },
      );
    },
    [comicId],
  );

  return updateProgress;
};

export default function ComicReader(props: Route.ComponentProps) {
  return <ComicReaderContent key={props.loaderData.comic.id} {...props} />;
}

function ComicReaderContent({ loaderData }: Route.ComponentProps) {
  const { comic, nextComic } = loaderData;
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as ReaderLocationState | null;
  const from = isInAppPath(locationState?.from) ? locationState.from : undefined;
  const fallbackDestination =
    comic.seriesId && comic.seriesSlug
      ? seriesDetailsHref({ id: comic.seriesId, slug: comic.seriesSlug })
      : '/';
  const closeDestination = from ?? fallbackDestination;
  const readerRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(comic.pageCount);
  const { pageNumber, setPageNumber } = usePageManager({
    pageCount,
    currentPage: comic.currentPage,
  });
  const [overlayOpen, setOverlayOpen] = useState(true);
  const [issueCompleteDialogOpen, setIssueCompleteDialogOpen] = useState(false);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const [deletePageDialogOpen, setDeletePageDialogOpen] = useState(false);
  const [combinePagesDialogOpen, setCombinePagesDialogOpen] = useState(false);
  const [thumbnailsOpen, setThumbnailsOpen] = useState(false);
  const { isFullscreen, toggleFullscreen } = useFullScreenManager(readerRef);

  const deleteFetcher = useFetcher();
  const isDeleting = deleteFetcher.state !== 'idle';

  const combineFetcher = useFetcher();
  const isCombining = combineFetcher.state !== 'idle';

  useEffect(() => {
    if (deleteFetcher.data && (deleteFetcher.data as any).success) {
      const newPageCount = (deleteFetcher.data as any).newPageCount as number;
      setPageCount(newPageCount);
      setPageNumber((prev) => Math.min(prev, newPageCount));
      setDeletePageDialogOpen(false);
    }
  }, [deleteFetcher.data]);

  useEffect(() => {
    if (combineFetcher.data && (combineFetcher.data as any).success) {
      const newPageCount = (combineFetcher.data as any).newPageCount as number;
      setPageCount(newPageCount);
      setPageNumber((prev) => Math.min(prev, newPageCount));
      setCombinePagesDialogOpen(false);
    }
  }, [combineFetcher.data]);

  useEffect(() => {
    if (!combinePagesDialogOpen) {
      readerRef.current?.focus();
    }
  }, [combinePagesDialogOpen]);

  const goNextPage = () => {
    const newPage = Math.min(pageNumber + 1, pageCount);
    setPageNumber(newPage);
    updateProgress(newPage);
    setOverlayOpen(false);
  };
  const goPreviousPage = () => {
    const newPage = Math.max(pageNumber - 1, 1);
    setPageNumber(newPage);
    updateProgress(newPage);
    setOverlayOpen(false);
  };

  const handlers = useSwipeable({
    onSwipedLeft: goNextPage,
    onSwipedRight: goPreviousPage,
  });
  const updateProgress = useProgressUpdater(comic.id);

  useEffect(() => {
    if (readerRef.current) {
      readerRef.current.focus();
    }
  }, []);

  const handleOnClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (issueCompleteDialogOpen || deletePageDialogOpen || combinePagesDialogOpen || thumbnailsOpen)
      return;

    if (optionsMenuOpen) {
      setOptionsMenuOpen(false);
      return;
    }

    const { clientX, currentTarget } = e;
    const { left, width } = currentTarget.getBoundingClientRect();
    const clickPosition = clientX - left;

    // if click is in less than 40% of the page, go to previous page
    if (clickPosition < width * 0.4) {
      goPreviousPage();
      // if the click is in more than 60% of the page, go to next page
    } else if (clickPosition > width * 0.6) {
      goNextPage();
      // if we try to page past the last page, show a completion dialog
      if (pageNumber + 1 > pageCount) setIssueCompleteDialogOpen(true);
    } else {
      setOverlayOpen((open) => !open);
    }
  };

  const handleCloseReader = (e?: React.MouseEvent<HTMLDivElement>) => {
    e?.stopPropagation();
    navigate(closeDestination);
  };

  const handleKeyboardInput = (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowLeft':
        if (
          !issueCompleteDialogOpen &&
          !deletePageDialogOpen &&
          !combinePagesDialogOpen &&
          !optionsMenuOpen &&
          !thumbnailsOpen
        )
          goPreviousPage();
        break;
      case 'ArrowRight':
        if (
          !issueCompleteDialogOpen &&
          !deletePageDialogOpen &&
          !combinePagesDialogOpen &&
          !optionsMenuOpen &&
          !thumbnailsOpen
        ) {
          goNextPage();
          if (pageNumber + 1 > pageCount) setIssueCompleteDialogOpen(true);
        }
        break;
      case 'Escape':
        if (thumbnailsOpen) {
          setThumbnailsOpen(false);
        } else if (combinePagesDialogOpen) {
          setCombinePagesDialogOpen(false);
        } else if (deletePageDialogOpen) {
          setDeletePageDialogOpen(false);
        } else if (issueCompleteDialogOpen) {
          setIssueCompleteDialogOpen(false);
        } else if (optionsMenuOpen) {
          setOptionsMenuOpen(false);
        } else {
          handleCloseReader();
        }
        break;
      default:
        break;
    }
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteFetcher.submit(
      {},
      {
        method: 'POST',
        action: `/comic/${idToSqid(comic.id)}/page/${pageNumber}/delete`,
        encType: 'application/json',
      },
    );
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
      <OverlayBar className="flex items-center gap-4" visible={overlayOpen} position="top">
        <div className="justify-flex-start ml-2">
          <div className="cursor-pointer" onClick={toggleFullscreen}>
            {isFullscreen ? <MdFullscreenExit size={24} /> : <MdFullscreen size={24} />}
          </div>
        </div>
        <div className="flex-1 text-center truncate select-none">{comicTitle(comic)}</div>
        <div className="relative flex items-center gap-2 mr-2">
          <div
            className="cursor-pointer"
            title="Page thumbnails"
            onClick={(e) => {
              e.stopPropagation();
              setThumbnailsOpen(true);
            }}
          >
            <MdGridView size={22} />
          </div>
          <div
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setOptionsMenuOpen((open) => !open);
            }}
          >
            <MdMoreVert size={24} />
          </div>
          {optionsMenuOpen && (
            <div
              className="absolute top-full right-0 mt-1 bg-slate-800 border border-slate-600 rounded shadow-lg z-50 min-w-[140px]"
              onClick={(e) => e.stopPropagation()}
            >
              {pageNumber < pageCount && (
                <button
                  className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOptionsMenuOpen(false);
                    setCombinePagesDialogOpen(true);
                  }}
                >
                  Combine Pages
                </button>
              )}
              <button
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  setOptionsMenuOpen(false);
                  setDeletePageDialogOpen(true);
                }}
              >
                Delete Page
              </button>
            </div>
          )}
          <div className="cursor-pointer" onClick={handleCloseReader}>
            <FaWindowClose />
          </div>
        </div>
      </OverlayBar>
      <img
        src={comicPageHref(comic, pageNumber, pageCount)}
        className="max-h-screen max-w-full object-contain select-none pointer-events-none"
      />
      <div className="absolute overflow-hidden w-0 h-0" aria-hidden="true">
        {pageNumber > 1 && <img src={comicPageHref(comic, pageNumber - 1, pageCount)} alt="" />}
        {pageNumber < pageCount && (
          <img src={comicPageHref(comic, pageNumber + 1, pageCount)} alt="" />
        )}
      </div>

      {thumbnailsOpen && (
        <PageThumbnailGrid
          comic={comic}
          pageCount={pageCount}
          currentPage={pageNumber}
          onSelectPage={(page) => {
            setPageNumber(page);
            updateProgress(page);
            setThumbnailsOpen(false);
          }}
          onClose={() => setThumbnailsOpen(false)}
        />
      )}

      {issueCompleteDialogOpen && (
        <div
          className={`absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center bg-slate-900/50 transition-opacity duration-500 ease-in-out ${issueCompleteDialogOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-slate-900 border border-slate-700 text-slate-100 p-6 w-[min(440px,90vw)] rounded shadow-xl">
            <h3 className="text-xl font-bold mb-1">Issue Complete!</h3>
            <p className="text-slate-400 mb-5">You've reached the end of this one!</p>
            {nextComic ? (
              <div className="flex gap-5 mb-6 items-center bg-slate-800 rounded-lg p-4">
                <img
                  src={getCoverPath(nextComic.id)}
                  alt={`Cover of ${nextComic.series} #${nextComic.number}`}
                  className="w-28 flex-shrink-0 object-contain rounded shadow"
                />
                <div className="min-w-0">
                  <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">Up next</p>
                  <p className="font-semibold text-base leading-snug">{nextComic.series}</p>
                  <p className="text-slate-300 mt-0.5">Issue #{nextComic.number}</p>
                </div>
              </div>
            ) : null}
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setIssueCompleteDialogOpen(false);
                  readerRef.current?.focus();
                }}
              >
                Close
              </Button>
              {nextComic ? (
                <Link to={comicReaderHref(nextComic)} state={{ from }} replace>
                  <Button>Read Next Issue</Button>
                </Link>
              ) : (
                <Link to={closeDestination}>
                  <Button>Exit</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {combinePagesDialogOpen && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center gap-4 p-4 max-w-full">
            <h3 className="text-lg font-bold text-slate-100">Combine Pages?</h3>
            <div className="flex">
              <img
                src={comicPageHref(comic, pageNumber, pageCount)}
                className="max-h-[70vh] max-w-[50vw] object-contain"
              />
              <img
                src={comicPageHref(comic, pageNumber + 1, pageCount)}
                className="max-h-[70vh] max-w-[50vw] object-contain"
              />
            </div>
            {combineFetcher.data && (combineFetcher.data as any).error && (
              <p className="text-sm text-red-400">{(combineFetcher.data as any).error}</p>
            )}
            <div className="flex gap-3">
              <Button
                variant="secondary"
                disabled={isCombining}
                onClick={(e) => {
                  e.stopPropagation();
                  setCombinePagesDialogOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={isCombining}
                onClick={(e) => {
                  e.stopPropagation();
                  combineFetcher.submit(
                    {},
                    {
                      method: 'POST',
                      action: `/comic/${idToSqid(comic.id)}/page/${pageNumber}/combine`,
                      encType: 'application/json',
                    },
                  );
                }}
              >
                {isCombining ? 'Combining…' : 'Combine'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deletePageDialogOpen && (
        <div
          className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center bg-slate-900/60 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-slate-900 border border-slate-700 text-slate-100 p-6 max-w-[380px] w-full mx-4 rounded shadow-xl">
            <h3 className="text-lg font-bold mb-2">Delete Page?</h3>
            <p className="mb-5 text-sm text-slate-300">
              Delete page {pageNumber} of {pageCount}?
            </p>
            {deleteFetcher.data && (deleteFetcher.data as any).error && (
              <p className="mb-4 text-sm text-red-400">{(deleteFetcher.data as any).error}</p>
            )}
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletePageDialogOpen(false);
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <button
                className="rounded px-2.5 py-1.5 text-sm font-semibold bg-red-700 hover:bg-red-800 text-white disabled:opacity-50 cursor-pointer"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <OverlayBar visible={overlayOpen} position="bottom">
        <ProgressBar className="m-2" value={(pageNumber / pageCount) * 100} />

        <div className="p-2 text-sm text-center select-none">
          Page {pageNumber} of {pageCount}
        </div>
      </OverlayBar>
    </div>
  );
}
