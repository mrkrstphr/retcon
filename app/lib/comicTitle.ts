import type { Nerp } from '~/types';

export const comicTitle = (comic: {
  fileName: string;
  number?: Nerp<string>;
  series?: Nerp<string>;
}) =>
  comic.series && comic.number
    ? `${comic.series} #${comic.number}`
    : comic.fileName
        .split('/')
        .pop()
        ?.replace(/\.[^/.]+$/, '') || comic.fileName;
