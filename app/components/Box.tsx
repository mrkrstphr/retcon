import type { HTMLAttributes } from 'react';

export type BoxProps = HTMLAttributes<HTMLDivElement>;

export const Box = ({ className, children }: BoxProps) => {
  const classes = ['bg-gray-100 dark:bg-slate-950 rounded-lg shadow p-4 w-full', className]
    .filter(Boolean)
    .join(' ');

  return <div className={classes}>{children}</div>;
};
