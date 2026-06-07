export type ProgressBarProps = React.HTMLAttributes<HTMLDivElement> & {
  backgroundColor?: string;
  barColor?: string;
  size?: number;
  value: number;
};

export function ProgressBar({ size = 1, value, ...props }: ProgressBarProps) {
  return (
    <div {...props}>
      <div className="bg-white/75 w-full rounded">
        <div
          className="bg-orange-500 rounded transition-[width] duration-500 ease-in-out"
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
            height: `${size * 0.25}rem`,
          }}
        />
      </div>
    </div>
  );
}
