import { useCallback, useEffect, useMemo } from 'react';
import { MdClose } from 'react-icons/md';
import { Grid, useGridRef } from 'react-window';
import { comicPageThumbnailHref } from '~/lib/links';

const CELL_HEIGHT = 176;
const CELL_PADDING = 4;
const COLUMN_COUNT = 5;

interface Comic {
  id: number;
}

interface PageThumbnailGridProps {
  comic: Comic;
  pageCount: number;
  currentPage: number;
  onSelectPage: (page: number) => void;
  onClose: () => void;
}

interface CellProps {
  columnCount: number;
  pageCount: number;
  currentPage: number;
  comic: Comic;
  onSelectPage: (page: number) => void;
}

function ThumbnailCell({
  ariaAttributes,
  columnIndex,
  rowIndex,
  style,
  columnCount,
  pageCount,
  currentPage,
  comic,
  onSelectPage,
}: {
  ariaAttributes: { 'aria-colindex': number; role: 'gridcell' };
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
} & CellProps) {
  const pageNumber = rowIndex * columnCount + columnIndex + 1;

  if (pageNumber > pageCount) {
    // Empty filler cell beyond the last page
    return <div style={style} />;
  }

  const isCurrent = pageNumber === currentPage;

  return (
    <div style={style} {...ariaAttributes} className="p-0.5">
      <button
        onClick={() => onSelectPage(pageNumber)}
        className={`flex flex-col items-center gap-1 w-full h-full cursor-pointer rounded overflow-hidden transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 ${isCurrent ? 'ring-2 ring-blue-400' : 'hover:ring-1 hover:ring-slate-500'}`}
        style={{ padding: CELL_PADDING }}
        title={`Page ${pageNumber}`}
      >
        <div className="flex-1 w-full flex items-center justify-center overflow-hidden rounded">
          <img
            src={comicPageThumbnailHref(comic, pageNumber, pageCount)}
            alt={`Page ${pageNumber}`}
            loading="lazy"
            className="max-h-full max-w-full object-contain"
          />
        </div>
        <span
          className={`text-xs select-none shrink-0 ${isCurrent ? 'text-blue-300 font-semibold' : 'text-slate-500'}`}
        >
          {pageNumber}
        </span>
      </button>
    </div>
  );
}

export function PageThumbnailGrid({
  comic,
  pageCount,
  currentPage,
  onSelectPage,
  onClose,
}: PageThumbnailGridProps) {
  const gridRef = useGridRef(null);

  const rowCount = Math.ceil(pageCount / COLUMN_COUNT);

  const scrollToCurrentPage = useCallback(() => {
    if (!gridRef.current) return;
    const rowIndex = Math.floor((currentPage - 1) / COLUMN_COUNT);
    // Scroll the row above into view at 'start' so the current page row is
    // fully visible as the first or second row rather than clipped at the top.
    gridRef.current.scrollToCell({
      rowIndex: Math.max(0, rowIndex - 1),
      columnIndex: 0,
      rowAlign: 'start',
      columnAlign: 'start',
    });
  }, [currentPage]);

  // Defer via rAF so the grid has finished measuring its container before we scroll.
  useEffect(() => {
    const id = requestAnimationFrame(scrollToCurrentPage);
    return () => cancelAnimationFrame(id);
  }, [scrollToCurrentPage]);

  const cellProps = useMemo<CellProps>(
    () => ({ columnCount: COLUMN_COUNT, pageCount, currentPage, comic, onSelectPage }),
    [pageCount, currentPage, comic, onSelectPage],
  );

  return (
    <div
      className="absolute inset-0 z-[60] flex"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      {/* Panel with 20px margin on all sides */}
      <div className="flex flex-col flex-1 m-5 rounded-lg overflow-hidden bg-slate-900/95 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/60 shrink-0">
          <span className="text-sm text-slate-300 font-medium select-none">
            Pages ({pageCount})
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-slate-500 hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Close page thumbnails"
          >
            <MdClose size={20} />
          </button>
        </div>

        {/* Virtualized grid — fills remaining space */}
        <div className="flex-1 overflow-hidden">
          <Grid
            gridRef={gridRef}
            columnCount={COLUMN_COUNT}
            columnWidth={`${100 / COLUMN_COUNT}%`}
            rowCount={rowCount}
            rowHeight={CELL_HEIGHT}
            cellComponent={ThumbnailCell}
            cellProps={cellProps}
            overscanCount={2}
            className="focus:outline-none"
            style={{ height: '100%', width: '100%' }}
          />
        </div>
      </div>
    </div>
  );
}
