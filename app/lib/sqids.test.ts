import { describe, expect, it } from 'vitest';
import { idToSqid, sqidToId, sqidToIdOr404 } from './sqids.js';

describe('idToSqid / sqidToId', () => {
  it('roundtrips arbitrary ids', () => {
    for (const id of [1, 42, 999, 100_000]) {
      expect(sqidToId(idToSqid(id))).toBe(id);
    }
  });

  it('produces at least 4-character strings', () => {
    expect(idToSqid(1).length).toBeGreaterThanOrEqual(4);
  });

  it('produces different sqids for different ids', () => {
    expect(idToSqid(1)).not.toBe(idToSqid(2));
  });
});

describe('sqidToId', () => {
  it('throws on invalid sqid', () => {
    expect(() => sqidToId('____')).toThrow('Invalid sqid');
  });
});

describe('sqidToIdOr404', () => {
  it('decodes valid sqid', () => {
    const sqid = idToSqid(99);
    expect(sqidToIdOr404(sqid)).toBe(99);
  });

  it('throws a Response with status 404 on invalid sqid', () => {
    let thrown: unknown;
    try {
      sqidToIdOr404('____');
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(404);
  });

  it('includes resourceType in 404 body', async () => {
    let thrown: unknown;
    try {
      sqidToIdOr404('____', 'Comic');
    } catch (e) {
      thrown = e;
    }
    const text = await (thrown as Response).text();
    expect(text).toContain('Comic');
  });
});
