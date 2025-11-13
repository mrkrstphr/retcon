import { idToSqid } from './sqids';

export const comicDetailsHref = ({ id, slug }: { id: number; slug: string }) =>
  `/comic/${idToSqid(id)}/${slug}`;

export const comicReaderHref = ({ id }: { id: number }) =>
  `/comic/${idToSqid(id)}/read`;

export const comicPageHref = ({ id }: { id: number }, page: number) =>
  `/comic/${idToSqid(id)}/page/${page}`;
