import { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useFetcher } from 'react-router';
import { useFocusTrap } from '~/hooks/useFocusTrap';
import type { ChangelogResult } from '~/services/changelog.server';

type ChangelogModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  const fetcher = useFetcher<ChangelogResult>();
  const focusTrapRef = useFocusTrap<HTMLDivElement>(isOpen);

  useEffect(() => {
    if (isOpen && fetcher.state === 'idle' && !fetcher.data) {
      fetcher.load('/changelog');
    }
  }, [isOpen, fetcher]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const releases = fetcher.data?.releases ?? [];
  const fetchError = fetcher.data?.error;
  const isLoading = fetcher.state === 'loading';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        ref={focusTrapRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Changelog</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
            </div>
          )}

          {!isLoading && fetchError && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              Could not fetch releases from GitHub: {fetchError}
            </div>
          )}

          {!isLoading && releases.length === 0 && !fetchError && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No releases found.
            </div>
          )}

          {releases.map((release, i) => (
            <div
              key={release.id}
              className={i > 0 ? 'mt-6 pt-6 border-t border-gray-200 dark:border-gray-700' : ''}
            >
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {release.name || release.tag_name}
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-4 shrink-0">
                  {new Date(release.published_at).toLocaleDateString()}
                </span>
              </div>
              {release.body ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{release.body}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No release notes.</p>
              )}
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-center">
          <a
            href={`https://github.com/mrkrstphr/retcon/releases`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-orange-600 dark:text-orange-400 hover:underline"
          >
            View all releases on GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
