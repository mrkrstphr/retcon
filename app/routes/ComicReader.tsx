import { useEffect, useRef, useState } from 'react';
import { useFetcher } from 'react-router';
import { getComicById } from '~/db/queries';
import { comicPageHref } from '~/lib/links';
import { idToSqid, sqidToId } from '~/lib/sqids';
import type { Route } from './+types/ComicReader';

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
  const [pageNumber, setPageNumber] = useState(comic.currentPage ?? 1);
  const readerRef = useRef<HTMLDivElement>(null);
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
    const { clientX, currentTarget } = e;
    const { left, width } = currentTarget.getBoundingClientRect();
    const clickPosition = clientX - left;

    if (clickPosition < width * 0.4) {
      setPageNumber((prev) => Math.max(prev - 1, 1));
    } else if (clickPosition > width * 0.6) {
      setPageNumber((prev) => Math.min(prev + 1, comic.pageCount));
    }
  };

  const handleKeyboardInput = (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowLeft':
        setPageNumber((prev) => Math.max(prev - 1, 1));
        break;
      case 'ArrowRight':
        setPageNumber((prev) => Math.min(prev + 1, comic.pageCount));
        break;
      case 'Escape':
        window.history.back();
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
      className="flex justify-center items-center select-none"
      ref={readerRef}
    >
      <img
        src={comicPageHref(comic, pageNumber)}
        className="w-auto h-screen pointer-events-none"
      />
    </div>
  );
}
