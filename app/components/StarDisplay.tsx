interface StarDisplayProps {
  rating: number | null | undefined;
  className?: string;
}

export function StarDisplay({ rating, className = '' }: StarDisplayProps) {
  if (!rating) return null;

  const label = rating % 1 === 0 ? rating.toFixed(0) : String(rating);

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs text-slate-500 dark:text-slate-400 ${className}`}
      title={`Rated ${label} out of 5`}
    >
      <span className="text-yellow-400">★</span>
      {label}
    </span>
  );
}
