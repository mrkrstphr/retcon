import type { InputHTMLAttributes } from 'react';
import { makeClassName } from '~/lib/makeClassName';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, type = 'text', ...props }: InputProps) {
  const classes = makeClassName(
    'border rounded-lg block w-full p-2.5',
    'bg-slate-50 border-slate-300 text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white',
    'focus:ring-primary-600 focus:border-primary-600 dark:focus:ring-blue-500 dark:focus:border-blue-500',
    className,
  );

  return <input {...props} type={type} className={classes} />;
}
