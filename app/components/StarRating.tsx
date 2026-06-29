import { useState } from 'react';
import { useFetcher } from 'react-router';
import { idToSqid } from '~/lib/sqids';

const QUARTERS = [0.25, 0.5, 0.75, 1.0] as const;
const STEP = 0.25;
const MIN = STEP;
const MAX = 5;

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

  function handleSet(value: number | null) {
    setOptimistic(value);
    fetcher.submit(
      { rating: value },
      {
        method: 'POST',
        action: `/issue/${idToSqid(comicId)}/rating`,
        encType: 'application/json',
      },
    );
  }

  function handleClick(value: number) {
    const next = value === committed ? null : value;
    handleSet(next);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const current = committed ?? 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (current < MAX) handleSet(Math.min(MAX, current + STEP));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (current > MIN) handleSet(Math.max(MIN, current - STEP));
      else if (current > 0) handleSet(null);
    } else if (e.key === 'Home') {
      e.preventDefault();
      handleSet(MIN);
    } else if (e.key === 'End') {
      e.preventDefault();
      handleSet(MAX);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      handleSet(null);
    }
  }

  const valueText = committed ? `${committed} out of 5 stars` : 'No rating';

  return (
    <div className="flex items-center gap-2">
      <div
        className="relative inline-flex cursor-pointer"
        onMouseLeave={() => setHovered(null)}
        role="slider"
        aria-label="Rating"
        aria-valuenow={committed ?? 0}
        aria-valuemin={0}
        aria-valuemax={MAX}
        aria-valuetext={valueText}
        tabIndex={0}
        onKeyDown={handleKeyDown}
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
        <div className="absolute inset-0 flex" aria-hidden="true">
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
