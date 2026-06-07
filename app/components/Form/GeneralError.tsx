import type { HTMLAttributes } from 'react';
import { makeClassName } from '~/lib/makeClassName';

export type GeneralErrorProps = HTMLAttributes<HTMLDivElement>;

export function GeneralError({
  children,
  className,
  ...props
}: GeneralErrorProps) {
  const classes = makeClassName(
    'rounded bg-red-300/50 dark:bg-red-700/50 px-4 py-2 text-sm text-red-700 dark:text-red-100',
    className,
  );
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
