import type { HTMLAttributes } from 'react';
import { FaCheckCircle } from 'react-icons/fa';
import { getCoverPath } from '~/lib/getCoverPath';
import type { Nerp } from '~/types';
import { ProgressBar } from './ProgressBar';

export type CoverProps = HTMLAttributes<HTMLDivElement> & {
  comic: {
    id: number;
    series: Nerp<string>;
    number: Nerp<string>;
    pageCount: number;
    currentPage: Nerp<number>;
    isRead: Nerp<boolean>;
  };
};

export function Cover({ className, comic, ...props }: CoverProps) {
  return (
    <div
      className={['relative', className].filter(Boolean).join(' ')}
      {...props}
    >
      <img
        src={getCoverPath(comic.id)}
        alt={
          comic.series && comic.number
            ? `${comic.series} #${comic.number}`
            : 'Comic cover'
        }
        className="w-full h-full object-cover object-top aspect-3/4 rounded-md"
        onError={(e) => {
          // Hide broken images
          e.currentTarget.style.display = 'none';
        }}
      />
      {comic.currentPage && !comic.isRead && (
        <ProgressBar
          size={2}
          value={(comic.currentPage / comic.pageCount) * 100}
          className="absolute bottom-2 left-2 right-2"
        />
      )}
      {comic.isRead && (
        <FaCheckCircle className="absolute bottom-2 right-2 text-green-600 bg-white p-0.5 rounded-full size-6" />
      )}
    </div>
  );
}
