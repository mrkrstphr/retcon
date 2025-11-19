import type { IconType } from 'react-icons/lib';

export type PageHeaderProps = {
  title: string;
  attributes?: {
    label: string;
    icon?: IconType;
  }[];
};

export function PageHeader({ title, attributes }: PageHeaderProps) {
  return (
    <div className="lg:flex lg:items-center lg:justify-between mb-8 border-b border-slate-300 dark:border-slate-600 pb-3">
      <div className="min-w-0 flex-1">
        <h2 className="text-2xl/7 font-bold text-slate-900 sm:truncate sm:text-3xl sm:tracking-tight dark:text-white">
          {title}
        </h2>
        <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
          {(attributes || []).map((attr, index) => (
            <div
              key={`attr-${attr.label}-${index}`}
              className="mt-2 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400"
            >
              {attr.icon && (
                <attr.icon
                  aria-hidden="true"
                  className={`size-5 shrink-0 text-slate-400 dark:text-slate-500`}
                />
              )}
              <span>{attr.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 flex lg:mt-0 lg:ml-4">
        {/* future actions area */}
      </div>
    </div>
  );
}
