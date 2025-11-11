import { getComicCount, getRecentComics, getLastScanTime } from '../db/queries';
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
  const [comicCount, recentComics, lastScanTime] = await Promise.all([
    getComicCount(),
    getRecentComics(10),
    getLastScanTime(),
  ]);

  return { comicCount, recentComics, lastScanTime };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { comicCount, recentComics, lastScanTime } = loaderData;

  return (
    <div className="py-16">
      <div className="text-center max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8">Comic Scanner</h1>

        <div className="bg-white dark:bg-slate-950 rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-lg font-medium text-slate-600 dark:text-slate-200 mb-2">
            Total Comics
          </h2>
          <p className="text-5xl font-bold text-green-600 dark:text-green-300">
            {comicCount}
          </p>
        </div>

        {recentComics.length > 0 && (
          <div className="bg-white dark:bg-slate-950 rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-6">
              Recently Added Comics
            </h2>
            <div className="space-y-3">
              {recentComics.map((comic) => (
                <div
                  key={comic.id}
                  className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex-1 text-left">
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {comic.series && comic.number
                        ? `${comic.series} #${comic.number}${comic.volume ? ` (Vol. ${comic.volume})` : ''}`
                        : comic.fileName
                            .split('/')
                            .pop()
                            ?.replace(/\.[^/.]+$/, '') || comic.fileName}
                    </div>
                    {comic.publisher && (
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {comic.publisher}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-500">
                    {new Date(comic.lastSynced).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {lastScanTime && (
          <div className="mt-8 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Last scan: {new Date(lastScanTime).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
