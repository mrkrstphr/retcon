import { idToSqid } from './sqids';

export const getCoverPath = (id: number) => {
  return `/cover/${idToSqid(id)}`;
};
