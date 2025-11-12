import { LuBookDashed } from 'react-icons/lu';

export type Props = {
  title: string;
  details?: string;
};

export function NoResults({ title, details }: Props) {
  return (
    <div className="bg-white dark:bg-slate-950 rounded-lg shadow-md p-8">
      <div className="text-center text-slate-500 dark:text-slate-400">
        <LuBookDashed className="size-10 inline mb-4" />
        <p>{title}</p>
        {details && <p className="text-sm mt-2">{details}</p>}
      </div>
    </div>
  );
}
