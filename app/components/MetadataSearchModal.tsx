import { useEffect, useRef, useState } from 'react';
import { useFetcher } from 'react-router';
import { useFocusTrap } from '~/hooks/useFocusTrap';
import { idToSqid } from '~/lib/sqids';
import type { MetadataSearchResult } from '~/schemas/metadata';
import { Button } from './Button';
import { MetadataResultCard } from './MetadataResultCard';

export type MetadataSearchModalProps = {
  comicId: number;
  comicFileName: string;
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (result: MetadataSearchResult) => void;
  onApply?: (fullMetadata: MetadataSearchResult, originalResult: MetadataSearchResult) => void;
};

type SearchResponse = {
  results: MetadataSearchResult[];
  query: string;
  parsed: any;
};

type ApplyResponse = {
  success: boolean;
  message: string;
};

export function MetadataSearchModal({
  comicId,
  comicFileName,
  isOpen,
  onClose,
  onSelect,
  onApply,
}: MetadataSearchModalProps) {
  const searchFetcher = useFetcher<SearchResponse>();
  const applyFetcher = useFetcher<any>();
  const [selectedResult, setSelectedResult] = useState<MetadataSearchResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const previousApplyStateRef = useRef<'idle' | 'submitting' | 'loading'>('idle');
  const focusTrapRef = useFocusTrap<HTMLDivElement>(isOpen);

  useEffect(() => {
    if (isOpen && searchFetcher.state === 'idle' && !searchFetcher.data) {
      searchFetcher.submit(
        {},
        {
          method: 'POST',
          action: `/comics/${idToSqid(comicId)}/metadata-search`,
        },
      );
    }
  }, [isOpen, comicId, searchFetcher]);

  useEffect(() => {
    if (searchFetcher.data?.query && !searchQuery) {
      setSearchQuery(searchFetcher.data.query);
    }
  }, [searchFetcher.data?.query, searchQuery]);

  useEffect(() => {
    if (isOpen) {
      setSelectedResult(null);
    }
  }, [isOpen]);

  // Handle fetch completion and call onApply
  useEffect(() => {
    const justFinished =
      (previousApplyStateRef.current === 'loading' ||
        previousApplyStateRef.current === 'submitting') &&
      applyFetcher.state === 'idle';

    previousApplyStateRef.current = applyFetcher.state;

    if (justFinished) {
      if (applyFetcher.data?.fullMetadata) {
        if (onApply && selectedResult) {
          onApply(applyFetcher.data.fullMetadata, selectedResult);
        }
        onClose();
      }
      // Don't close on error - let user see the error message
    }
  }, [applyFetcher.state, applyFetcher.data, onApply, onClose, selectedResult]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSelectedResult(null);
    searchFetcher.submit(
      { query: searchQuery.trim() },
      {
        method: 'POST',
        action: `/comics/${idToSqid(comicId)}/metadata-search`,
        encType: 'application/json',
      },
    );
  };

  const handleApply = () => {
    if (!selectedResult) return;

    // Fetch full metadata from ComicVine
    applyFetcher.submit(
      {
        resultId: selectedResult.id,
        provider: selectedResult.provider,
      },
      {
        method: 'POST',
        action: `/comics/${idToSqid(comicId)}/fetch-metadata`,
        encType: 'application/json',
      },
    );
  };

  if (!isOpen) return null;

  const isSearching = searchFetcher.state === 'loading' || searchFetcher.state === 'submitting';
  const isFetching = applyFetcher.state === 'submitting' || applyFetcher.state === 'loading';
  const searchError =
    searchFetcher.data && 'error' in searchFetcher.data ? (searchFetcher.data as any).error : null;
  const fetchError =
    applyFetcher.data && 'error' in applyFetcher.data ? (applyFetcher.data as any).error : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={isFetching && !fetchError ? undefined : onClose}
    >
      <div
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="metadata-search-title"
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {isFetching && (
          <div className="absolute inset-0 bg-white/90 dark:bg-gray-800/90 z-50 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-600 border-t-transparent" />
              <p className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                Fetching Full Metadata
              </p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Retrieving complete details from ComicVine...
              </p>
            </div>
          </div>
        )}

        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="metadata-search-title" className="text-xl font-semibold">
                Search Metadata
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{comicFileName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSearch} className="mt-4 flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Edit search query..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              disabled={isFetching}
            />
            <Button type="submit" disabled={!searchQuery.trim() || isSearching || isFetching}>
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isSearching && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
                <p className="mt-2 text-gray-600 dark:text-gray-400">Searching ComicVine...</p>
              </div>
            </div>
          )}

          {searchError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 text-red-800 dark:text-red-200 mb-4">
              <p className="font-semibold">Search Error</p>
              <p className="text-sm mt-1">{searchError}</p>
            </div>
          )}

          {fetchError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 text-red-800 dark:text-red-200 mb-4">
              <p className="font-semibold">Failed to fetch full metadata</p>
              <p className="text-sm mt-1">{fetchError}</p>
            </div>
          )}

          {searchFetcher.data?.results && (
            <>
              {searchFetcher.data.results.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 dark:text-gray-400">
                    No matches found for "{searchFetcher.data.query}"
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    Try renaming the file with more specific information
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Found {searchFetcher.data.results.length} result
                    {searchFetcher.data.results.length !== 1 ? 's' : ''} for "
                    {searchFetcher.data.query}"
                  </p>
                  {searchFetcher.data.results.map((result) => (
                    <MetadataResultCard
                      key={`${result.provider}-${result.id}`}
                      result={result}
                      isSelected={
                        selectedResult?.id === result.id &&
                        selectedResult?.provider === result.provider
                      }
                      onSelect={() => setSelectedResult(result)}
                      disabled={isFetching}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {isFetching ? (
              <span className="flex items-center gap-2">
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600" />
                Fetching full metadata...
              </span>
            ) : selectedResult ? (
              'Click "Continue" to review and edit metadata'
            ) : (
              'Select a result to continue'
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={isFetching && !fetchError}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={!selectedResult || isFetching}>
              {isFetching ? 'Fetching...' : 'Continue'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
