import { useState } from 'react';

/**
 * Manages the current page number for the comic reader.
 *
 * Resets to page 1 when currentPage is at or beyond pageCount — this covers
 * two cases: a completed comic restarting from the beginning, and an invalid
 * saved position after pages have been deleted.
 */
export function usePageManager({
  pageCount,
  currentPage,
}: {
  pageCount: number;
  currentPage?: number | null;
}) {
  const initialPage = currentPage && currentPage >= pageCount ? 1 : (currentPage ?? 1);
  const [pageNumber, setPageNumber] = useState(initialPage);

  return { pageNumber, setPageNumber };
}
