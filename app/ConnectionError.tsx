import { ImDatabase } from 'react-icons/im';

export function ConnectionError() {
  return (
    <div className="h-dvh flex items-center justify-center">
      <title>Connection Error</title>
      <div className="flex items-start justify-center gap-4 max-w-1/2">
        <ImDatabase className="size-8 shrink-0 text-orange-500" />
        <div>
          <h1 className="text-2xl font-bold mb-4">Connection Error</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            We are having trouble connecting to your database. Please check your
            internet connection and try again.
          </p>
        </div>
      </div>
    </div>
  );
}
