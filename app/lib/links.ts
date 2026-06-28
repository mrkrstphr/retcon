import { idToSqid } from './sqids';

export type ReaderLocationState = { from?: string };

// Same-origin relative paths only; reject absolute and protocol-relative ("//evil").
export const isInAppPath = (p: unknown): p is string =>
  typeof p === 'string' && p.startsWith('/') && !p.startsWith('//');

export const comicDetailsHref = ({ id, slug }: { id: number; slug: string }) =>
  `/comic/${idToSqid(id)}/${slug}`;

export const comicReaderHref = ({ id }: { id: number }) => `/comic/${idToSqid(id)}/read`;

export const comicPageHref = ({ id }: { id: number }, page: number, v?: number) =>
  `/comic/${idToSqid(id)}/page/${page}${v !== undefined ? `?v=${v}` : ''}`;

export const comicPageThumbnailHref = ({ id }: { id: number }, page: number, v?: number) =>
  `/comic/${idToSqid(id)}/page/${page}/thumbnail${v !== undefined ? `?v=${v}` : ''}`;

export const seriesDetailsHref = ({ id, slug }: { id: number; slug: string }) =>
  `/series/${idToSqid(id)}/${slug}`;
