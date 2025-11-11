import { getComicCount, getLastScanTime, getRecentComics } from '../db/queries';
import { APP_NAME } from '../constants';
import type { Route } from './+types/home';

export function meta({}: Route.MetaArgs) {
  return [
    { title: `${APP_NAME} - Home` },
    {
      name: 'description',
      content: 'Organize and browse your comic book collection',
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

// Helper function to generate cover image path
const getCoverPath = (id: string) => {
  const subdirectory = id[0].toLowerCase();
  return `/covers/${subdirectory}/${id}.jpg`;
};

export default function Home({ loaderData }: Route.ComponentProps) {
  const { comicCount, recentComics, lastScanTime } = loaderData;

  return (
    <div className="py-16">
      <div className="text-center max-w-6xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8">{APP_NAME}</h1>

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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {recentComics.map((comic) => (
                <div
                  key={comic.id}
                  className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="aspect-3/4 mb-3 bg-slate-200 dark:bg-slate-700 rounded overflow-hidden">
                    <img
                      src={getCoverPath(comic.id)}
                      alt={
                        comic.series && comic.number
                          ? `${comic.series} #${comic.number}`
                          : 'Comic cover'
                      }
                      className="w-full h-full object-cover object-top"
                      onError={(e) => {
                        // Hide broken images
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="text-sm text-center">
                    <div className="font-medium text-slate-900 dark:text-slate-100 mb-1 overflow-hidden">
                      <div className="line-clamp-2 leading-tight">
                        {comic.series && comic.number
                          ? `${comic.series} #${comic.number}`
                          : comic.fileName
                              .split('/')
                              .pop()
                              ?.replace(/\.[^/.]+$/, '') || comic.fileName}
                      </div>
                    </div>
                    {comic.publisher && (
                      <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                        {comic.publisher}
                      </div>
                    )}
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
