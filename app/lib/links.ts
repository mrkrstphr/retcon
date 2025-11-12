import { idToSqid } from './sqids';

export const comicDetailsHref = ({ id, slug }: { id: number; slug: string }) =>
  `/comic/${idToSqid(id)}/${slug}`;
