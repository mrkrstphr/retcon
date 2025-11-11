import { getComicCount } from '../db/queries';
import type { Route } from './+types/home';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Comic Scanner - Home' },
    {
      name: 'description',
      content: 'Your comic book collection scanner and catalog',
    },
  ];
}

export async function loader({}: Route.LoaderArgs) {
  const comicCount = await getComicCount();
  return { comicCount };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { comicCount } = loaderData;

  return (
    <div className="py-16">
      <div className="text-center max-w-md mx-auto">
        <h1 className="text-4xl font-bold mb-8">Comic Scanner</h1>

        <div className="bg-white dark:bg-slate-950 rounded-lg shadow-md p-8 min-w-64">
          <h2 className="text-lg font-medium text-slate-600 dark:text-slate-200 mb-2">
            Total Comics
          </h2>
          <p className="text-5xl font-bold text-green-600 dark:text-green-300">
            {comicCount}
          </p>
        </div>
      </div>
    </div>
  );
}
