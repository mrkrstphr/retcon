import { useState } from 'react';
import { useFetcher } from 'react-router';
import { idToSqid } from '~/lib/sqids';

const QUARTERS = [0.25, 0.5, 0.75, 1.0] as const;

interface StarRatingProps {
  comicId: number;
  rating: number | null | undefined;
}

export function StarRating({ comicId, rating: initialRating }: StarRatingProps) {
  const fetcher = useFetcher();
  const [optimistic, setOptimistic] = useState<number | null | undefined>(undefined);
  const [hovered, setHovered] = useState<number | null>(null);

  const committed = optimistic !== undefined ? optimistic : (initialRating ?? null);
  const display = hovered ?? committed;
  const percentage = display ? (display / 5) * 100 : 0;

  function handleClick(value: number) {
    const next = value === committed ? null : value;
    setOptimistic(next);
    fetcher.submit(
      { rating: next },
      {
        method: 'POST',
        action: `/issue/${idToSqid(comicId)}/rating`,
        encType: 'application/json',
      },
    );
  }

  const label = committed ? `Rated ${committed} out of 5 — click to change` : 'Rate this comic';

  return (
    <div className="flex items-center gap-2">
      <div
        className="relative inline-flex cursor-pointer"
        onMouseLeave={() => setHovered(null)}
        role="group"
        aria-label={label}
      >
        {/* Visual star track */}
        <span
          className="relative inline-flex text-slate-300 dark:text-slate-600 text-2xl leading-none select-none"
          aria-hidden
        >
          ★★★★★
          <span
            className="absolute inset-0 text-yellow-400 overflow-hidden"
            style={{ width: `${percentage}%` }}
          >
            ★★★★★
          </span>
        </span>

        {/* Invisible quarter-precision click/hover targets */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: 5 }, (_, starIdx) => (
            <div key={starIdx} className="flex flex-1">
              {QUARTERS.map((q) => {
                const value = starIdx + q;
                return (
                  <div
                    key={q}
                    className="flex-1 h-full"
                    onMouseEnter={() => setHovered(value)}
                    onClick={() => handleClick(value)}
                    role="button"
                    aria-label={`${value} star${value !== 1 ? 's' : ''}`}
                    tabIndex={-1}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {committed && (
        <span className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
          {committed % 1 === 0 ? committed.toFixed(0) : committed}
          <span className="text-xs text-slate-400 dark:text-slate-500">/5</span>
        </span>
      )}
    </div>
  );
}
