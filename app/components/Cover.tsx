import { useState, type HTMLAttributes } from 'react';
import { FaCheckCircle, FaImage } from 'react-icons/fa';
import { getCoverPath } from '~/lib/getCoverPath';
import type { Nerp } from '~/types';
import { ProgressBar } from './ProgressBar';

export type CoverProps = HTMLAttributes<HTMLDivElement> & {
  comic: {
    id: number;
    series?: Nerp<string>;
    number?: Nerp<string>;
    pageCount?: number;
    currentPage?: Nerp<number>;
    isRead?: Nerp<boolean>;
  };
};

export function Cover({ className, comic, ...props }: CoverProps) {
  const [hasError, setHasError] = useState(false);
  const currentPage = comic.currentPage || 0;
  const pageCount = comic.pageCount || 0;

  return (
    <div className={['relative', className].filter(Boolean).join(' ')} {...props}>
      {hasError ? (
        <div className="w-full aspect-3/4 rounded-md bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
          <FaImage className="text-gray-400 dark:text-gray-500 text-3xl" />
        </div>
      ) : (
        <img
          src={getCoverPath(comic.id)}
          alt={comic.series && comic.number ? `${comic.series} #${comic.number}` : 'Comic cover'}
          className="w-full h-full object-cover object-top aspect-3/4 rounded-md"
          onError={() => setHasError(true)}
        />
      )}
      {currentPage > 0 && pageCount > 0 && !comic.isRead && (
        <ProgressBar
          size={2}
          value={(currentPage / pageCount) * 100}
          className="absolute bottom-2 left-2 right-2"
        />
      )}
      {comic.isRead && (
        <FaCheckCircle className="absolute bottom-2 right-2 text-green-600 bg-white p-0.5 rounded-full size-6" />
      )}
    </div>
  );
}
