export type ButtonVariant = 'primary' | 'secondary';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-orange-600 dark:bg-orange-400 hover:bg-orange-700 dark:hover:bg-orange-500 text-white!',
  secondary:
    'bg-slate-600 dark:bg-slate-500 hover:bg-slate-700 dark:hover:bg-slate-600 text-white!',
};

export function Button({
  children,
  className,
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  const classes = [
    'rounded px-2.5 py-1.5 text-sm font-semibold shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 dark:shadow-none',
    'no-underline! cursor-pointer disabled:bg-slate-600 disabled:text-slate-400 disabled:pointer-events-none',
    buttonStyles[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} type={type} {...props}>
      {children}
    </button>
  );
}
