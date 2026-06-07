import { Link, type LinkProps } from 'react-router';
import { buttonStyles } from './Button';

export type ButtonVariant = 'primary' | 'secondary';

export type ButtonLinkProps = LinkProps & {
  variant?: ButtonVariant;
};
export function ButtonLink({
  children,
  className,
  variant = 'primary',
  ...props
}: ButtonLinkProps) {
  const classes = [
    'rounded px-2.5 py-1.5 text-sm font-semibold shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 dark:shadow-none',
    'no-underline! cursor-pointer',
    buttonStyles[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Link className={classes} {...props}>
      {children}
    </Link>
  );
}
