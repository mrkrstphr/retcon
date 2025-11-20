import { SQIDS_ALPHABET } from '@retcon/common/constants';
import Sqids from 'sqids';

const sqids = new Sqids({
  alphabet: SQIDS_ALPHABET,
  minLength: 4,
});

export const sqidToId = (sqid: string): number => {
  const decoded = sqids.decode(sqid);
  if (decoded.length === 0) {
    throw new Error(`Invalid sqid: ${sqid}`);
  }
  return decoded[0];
};

export const idToSqid = (id: number): string => {
  return sqids.encode([id]);
};

export { sqids };
