import type { LabelHTMLAttributes } from 'react';
import { makeClassName } from '~/lib/makeClassName';

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className, children, ...props }: LabelProps) {
  const classes = makeClassName('mb-2 block text-sm font-medium', className);

  return (
    <label {...props} className={classes}>
      {children}
    </label>
  );
}
