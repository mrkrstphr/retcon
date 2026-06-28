import type { HTMLAttributes } from 'react';
import { useEffect, useState } from 'react';
import { useFetcher } from 'react-router';
import { APP_VERSION } from '~/constants';
import { ChangelogModal } from '~/components/ChangelogModal';
import { integerFormat } from '~/lib/integerFormat';
import type { ChangelogResult } from '~/services/changelog.server';

export type StatsProps = HTMLAttributes<HTMLDivElement> & {
  comicCount: number;
  lastScanTime: Date | null;
};

export const Stats = ({ className, comicCount, lastScanTime, ...props }: StatsProps) => {
  const [changelogOpen, setChangelogOpen] = useState(false);
  const fetcher = useFetcher<ChangelogResult>();

  useEffect(() => {
    fetcher.load('/changelog');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const classes = [
    'flex flex-col gap-1',
    'pt-2 mx-2',
    'text-xs text-center text-gray-500 dark:text-gray-400 border-t border-gray-300 dark:border-gray-700',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const lastScan = lastScanTime
    ? new Date(lastScanTime).toLocaleString([], {
        hour: 'numeric',
        minute: 'numeric',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      })
    : 'Never';

  const { releases = [], hasUpdate = false, latestVersion, error: fetchError } = fetcher.data ?? {};
  const isLoading = fetcher.state === 'loading';

  return (
    <div className={classes} {...props}>
      <div>{integerFormat(comicCount)} total comics</div>
      <div>Last Scan: {lastScan}</div>
      <button
        onClick={() => setChangelogOpen(true)}
        className="relative inline-flex items-center justify-center gap-1 text-orange-600 dark:text-orange-400 underline underline-offset-2 hover:text-orange-800 dark:hover:text-orange-200 cursor-pointer transition-colors"
      >
        v{APP_VERSION}
        {hasUpdate && (
          <span className="relative flex w-1.5 h-1.5 shrink-0" aria-label="Update available">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500" />
          </span>
        )}
      </button>
      <ChangelogModal
        isOpen={changelogOpen}
        onClose={() => setChangelogOpen(false)}
        releases={releases}
        isLoading={isLoading}
        hasUpdate={hasUpdate}
        latestVersion={latestVersion}
        error={fetchError}
      />
    </div>
  );
};
