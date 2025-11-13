export type OverlayBarProps = React.HTMLAttributes<HTMLDivElement> & {
  position?: 'top' | 'bottom';
  visible?: boolean;
};

export const OverlayBar = ({
  children,
  className,
  position = 'top',
  visible = true,
  ...props
}: OverlayBarProps) => {
  const classes = [
    'absolute left-0 w-full text-gray-100 bg-black/80 p-2 transition-opacity duration-500 ease-in-out',
    visible ? 'opacity-100' : 'opacity-0',
    position === 'top' ? 'top-0' : 'bottom-0',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};
