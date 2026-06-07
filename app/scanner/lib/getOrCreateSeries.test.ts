import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/queries.js', () => ({
  findSeriesByNameAndVolume: vi.fn(),
  createSeries: vi.fn(),
}));

import {
  createSeries,
  findSeriesByNameAndVolume,
} from '../../db/queries.js';
import { getOrCreateSeries } from './getOrCreateSeries.js';

type SeriesMap = Map<number, Map<string, Map<string, { id: number; name: string }>>>;

const mockFind = vi.mocked(findSeriesByNameAndVolume);
const mockCreate = vi.mocked(createSeries);

const publisherId = 1;
const dbSeries = {
  id: 10,
  name: 'Batman',
  slug: 'batman',
  volume: null,
  publisherId,
  createdAt: new Date(),
};

function makeMap(entry?: { id: number; name: string }): SeriesMap {
  const map: SeriesMap = new Map();
  if (entry) {
    map.set(publisherId, new Map([['batman', new Map([['__NA__', entry]])]]));
  }
  return map;
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('with map provided', () => {
  it('returns cached result on map hit without touching the DB', async () => {
    const cached = { id: 10, name: 'Batman' };
    const map = makeMap(cached);
    const result = await getOrCreateSeries(publisherId, 'Batman', null, map);
    expect(result).toEqual(cached);
    expect(mockFind).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('queries DB on map miss, returns existing, and populates map', async () => {
    mockFind.mockResolvedValue(dbSeries);
    const map = makeMap();
    const result = await getOrCreateSeries(publisherId, 'Batman', null, map);
    expect(result).toEqual({ id: 10, name: 'Batman' });
    expect(mockFind).toHaveBeenCalledWith('Batman', undefined, publisherId);
    expect(mockCreate).not.toHaveBeenCalled();
    expect(map.get(publisherId)?.get('batman')?.get('__NA__')).toEqual({
      id: 10,
      name: 'Batman',
    });
  });

  it('creates when both map and DB miss, and populates map', async () => {
    mockFind.mockResolvedValue(null);
    mockCreate.mockResolvedValue(dbSeries);
    const map = makeMap();
    const result = await getOrCreateSeries(publisherId, 'Batman', null, map);
    expect(result).toEqual({ id: 10, name: 'Batman' });
    expect(mockCreate).toHaveBeenCalledWith('Batman', undefined, publisherId);
    expect(map.get(publisherId)?.get('batman')?.get('__NA__')).toEqual({
      id: 10,
      name: 'Batman',
    });
  });
});

describe('without map', () => {
  it('queries DB and returns existing', async () => {
    mockFind.mockResolvedValue(dbSeries);
    const result = await getOrCreateSeries(publisherId, 'Batman', null);
    expect(result).toEqual({ id: 10, name: 'Batman' });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('creates when not found in DB', async () => {
    mockFind.mockResolvedValue(null);
    mockCreate.mockResolvedValue(dbSeries);
    const result = await getOrCreateSeries(publisherId, 'Batman', null);
    expect(result).toEqual({ id: 10, name: 'Batman' });
    expect(mockCreate).toHaveBeenCalledWith('Batman', undefined, publisherId);
  });
});

describe('volume handling', () => {
  it('passes trimmed volume to DB query', async () => {
    mockFind.mockResolvedValue({ ...dbSeries, name: 'Batman', volume: '2' });
    await getOrCreateSeries(publisherId, 'Batman', '  2  ');
    expect(mockFind).toHaveBeenCalledWith('Batman', '2', publisherId);
  });

  it('uses separate map bucket per volume', async () => {
    mockFind.mockResolvedValue({ ...dbSeries, id: 20, name: 'Batman', volume: '2' });
    const map = makeMap({ id: 10, name: 'Batman' }); // v1 already cached
    const result = await getOrCreateSeries(publisherId, 'Batman', '2', map);
    expect(result).toEqual({ id: 20, name: 'Batman' });
    expect(map.get(publisherId)?.get('batman')?.get('2')).toEqual({
      id: 20,
      name: 'Batman',
    });
  });
});

it('normalizes series name to lowercase for map key', async () => {
  mockFind.mockResolvedValue(dbSeries);
  const map = makeMap();
  await getOrCreateSeries(publisherId, 'BATMAN', null, map);
  expect(map.get(publisherId)?.get('batman')).toBeDefined();
});
