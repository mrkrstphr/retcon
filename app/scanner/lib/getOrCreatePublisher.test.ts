import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/queries.js', () => ({
  findPublisherByName: vi.fn(),
  createPublisher: vi.fn(),
}));

import { createPublisher, findPublisherByName } from '../../db/queries.js';
import { getOrCreatePublisher } from './getOrCreatePublisher.js';

const mockFind = vi.mocked(findPublisherByName);
const mockCreate = vi.mocked(createPublisher);

const publisher = { id: 42, name: 'DC Comics', slug: 'dc-comics', createdAt: new Date() };

beforeEach(() => {
  vi.resetAllMocks();
});

describe('with map provided', () => {
  it('returns cached id on map hit without touching the DB', async () => {
    const map = new Map([['DC Comics', 42]]);
    const result = await getOrCreatePublisher('DC Comics', map);
    expect(result).toBe(42);
    expect(mockFind).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('queries DB on map miss, returns existing id, and populates map', async () => {
    mockFind.mockResolvedValue(publisher);
    const map = new Map<string, number>();
    const result = await getOrCreatePublisher('DC Comics', map);
    expect(result).toBe(42);
    expect(mockFind).toHaveBeenCalledWith('DC Comics');
    expect(mockCreate).not.toHaveBeenCalled();
    expect(map.get('DC Comics')).toBe(42);
  });

  it('creates when both map and DB miss, and populates map', async () => {
    mockFind.mockResolvedValue(null);
    mockCreate.mockResolvedValue(publisher);
    const map = new Map<string, number>();
    const result = await getOrCreatePublisher('DC Comics', map);
    expect(result).toBe(42);
    expect(mockCreate).toHaveBeenCalledWith('DC Comics');
    expect(map.get('DC Comics')).toBe(42);
  });
});

describe('without map', () => {
  it('queries DB and returns existing id', async () => {
    mockFind.mockResolvedValue(publisher);
    const result = await getOrCreatePublisher('DC Comics');
    expect(result).toBe(42);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('creates when not found in DB', async () => {
    mockFind.mockResolvedValue(null);
    mockCreate.mockResolvedValue(publisher);
    const result = await getOrCreatePublisher('DC Comics');
    expect(result).toBe(42);
    expect(mockCreate).toHaveBeenCalledWith('DC Comics');
  });
});

it('trims whitespace before lookup', async () => {
  mockFind.mockResolvedValue(publisher);
  await getOrCreatePublisher('  DC Comics  ');
  expect(mockFind).toHaveBeenCalledWith('DC Comics');
});
