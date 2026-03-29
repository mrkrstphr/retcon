import { useState } from 'react';
import type { MetadataSearchResult } from '~/schemas/metadata';

export type MetadataResultCardProps = {
  result: MetadataSearchResult;
  onSelect: () => void;
  isSelected?: boolean;
  disabled?: boolean;
};

export function MetadataResultCard({
  result,
  onSelect,
  isSelected = false,
  disabled = false,
}: MetadataResultCardProps) {
  const [imageError, setImageError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const toggleExpanded = (e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const handleClick = () => {
    if (disabled) return;
    onSelect();
  };

  const summaryPreview =
    result.summary && result.summary.length > 150
      ? `${result.summary.slice(0, 150)}...`
      : result.summary;

  return (
    <div
      className={`border rounded-lg p-4 transition-all ${
        disabled
          ? 'opacity-60 cursor-not-allowed'
          : isSelected
            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 cursor-pointer'
            : 'border-gray-300 dark:border-gray-700 hover:border-orange-400 dark:hover:border-orange-600 cursor-pointer'
      }`}
      onClick={handleClick}
    >
      <div className="flex gap-4">
        <div className="shrink-0">
          {result.coverUrl && !imageError ? (
            <img
              src={result.coverUrl}
              alt={`${result.series} cover`}
              className="w-20 h-auto rounded object-cover"
              onError={handleImageError}
            />
          ) : (
            <div className="w-20 h-28 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-gray-400 text-xs">
              No Cover
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3 className="font-semibold text-base leading-tight">
                {result.series}
                {result.volume && (
                  <span className="text-gray-500 text-sm ml-1">
                    v{result.volume}
                  </span>
                )}
              </h3>
              {result.number && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Issue #{result.number}
                  {result.title && ` - ${result.title}`}
                </p>
              )}
            </div>
            {isSelected && (
              <div className="text-orange-500 font-semibold text-sm">
                Selected
              </div>
            )}
          </div>

          {result.publisher && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {result.publisher}
            </p>
          )}

          {result.releaseDate && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {new Date(result.releaseDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}

          {result.creators && (
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 space-y-0.5">
              {result.creators.writer && (
                <p>
                  <span className="font-medium">Writer:</span>{' '}
                  {result.creators.writer.join(', ')}
                </p>
              )}
              {result.creators.penciller && (
                <p>
                  <span className="font-medium">Penciller:</span>{' '}
                  {result.creators.penciller.join(', ')}
                </p>
              )}
            </div>
          )}

          {result.summary && (
            <div className="mt-2">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {expanded ? result.summary : summaryPreview}
              </p>
              {result.summary.length > 150 && (
                <button
                  onClick={toggleExpanded}
                  className="text-xs text-orange-600 dark:text-orange-400 hover:underline mt-1"
                >
                  {expanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}

          <div className="mt-2">
            <span className="inline-block px-2 py-0.5 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              {result.provider}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
