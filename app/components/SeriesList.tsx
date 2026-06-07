import { Link } from 'react-router';
import { seriesDetailsHref } from '~/lib/links';
import { Cover } from './Cover';

export type SeriesListProps = {
  series: {
    id: number;
    name: string;
    slug: string;
    comicCount: number;
    readCount: number;
    firstComicId?: number | null;
  }[];
};

export function SeriesList({ series }: SeriesListProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {series.map((result) => (
        <Link
          key={result.id}
          to={seriesDetailsHref(result)}
          className="bg-slate-50 dark:bg-slate-900 rounded-lg no-underline! p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors block"
        >
          {result.firstComicId && (
            <Cover
              comic={{
                id: result.firstComicId,
                isRead: result.readCount === result.comicCount,
                pageCount: result.comicCount,
                currentPage: result.readCount ?? 0,
              }}
            />
          )}

          <div className="text-sm text-center mt-2">
            <div className="font-medium text-slate-900 dark:text-slate-100 mb-1 overflow-hidden">
              <div className="line-clamp-2 leading-tight truncate" title={result.name}>
                {result.name}
              </div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-500 truncate">
              {result.comicCount} issue
              {result.comicCount !== 1 ? 's' : ''}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
