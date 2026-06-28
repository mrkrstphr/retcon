import type { HTMLAttributes } from 'react';
import { useState } from 'react';
import { APP_VERSION } from '~/constants';
import { ChangelogModal } from '~/components/ChangelogModal';
import { integerFormat } from '~/lib/integerFormat';

export type StatsProps = HTMLAttributes<HTMLDivElement> & {
  comicCount: number;
  lastScanTime: Date | null;
};

export const Stats = ({ className, comicCount, lastScanTime, ...props }: StatsProps) => {
  const [changelogOpen, setChangelogOpen] = useState(false);

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

  return (
    <div className={classes} {...props}>
      <div>{integerFormat(comicCount)} total comics</div>
      <div>Last Scan: {lastScan}</div>
      <button
        onClick={() => setChangelogOpen(true)}
        className="text-orange-600 dark:text-orange-400 underline underline-offset-2 hover:text-orange-800 dark:hover:text-orange-200 cursor-pointer transition-colors"
      >
        v{APP_VERSION}
      </button>
      <ChangelogModal isOpen={changelogOpen} onClose={() => setChangelogOpen(false)} />
    </div>
  );
};
