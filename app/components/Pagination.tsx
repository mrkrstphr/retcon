import { Link } from 'react-router';

export function Pagination({
  currentPage,
  totalPages,
  totalRecords,
  generatePageUrl,
  recordName = 'records',
}: {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  generatePageUrl: (page: number) => string;
  recordName?: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="py-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Showing {(currentPage - 1) * 25 + 1} to {Math.min(currentPage * 25, totalRecords)} of{' '}
          {totalRecords} {recordName}
        </div>
        <div className="flex space-x-2">
          {/* Previous Page */}
          {currentPage > 1 && (
            <Link
              to={generatePageUrl(currentPage - 1)}
              className="px-3 py-2 text-sm font-medium no-underline! text-slate-600! dark:text-slate-400! bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Previous
            </Link>
          )}

          {/* Page Numbers */}
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <Link
                key={pageNum}
                to={generatePageUrl(pageNum)}
                className={`px-3 py-2 text-sm font-medium no-underline! rounded-md ${
                  pageNum === currentPage
                    ? 'text-white! bg-blue-600 hover:bg-blue-700'
                    : 'text-slate-600! dark:text-slate-400! bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {pageNum}
              </Link>
            );
          })}

          {/* Next Page */}
          {currentPage < totalPages && (
            <Link
              to={generatePageUrl(currentPage + 1)}
              className="px-3 no-underline! py-2 text-sm font-medium text-slate-600! dark:text-slate-400! bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Next
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
