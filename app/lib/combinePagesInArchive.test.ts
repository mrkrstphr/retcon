import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('child_process', () => ({ exec: vi.fn() }));
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  rmSync: vi.fn(),
  writeFileSync: vi.fn(),
}));
vi.mock('sharp', () => ({ default: vi.fn() }));
vi.mock('./getSortedImagesFromZip.js', () => ({ getSortedImagesFromZip: vi.fn() }));
vi.mock('./extractPageFromArchive.js', () => ({ extractPageFromArchive: vi.fn() }));

import { exec } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import sharp from 'sharp';
import { extractPageFromArchive } from './extractPageFromArchive.js';
import { getSortedImagesFromZip } from './getSortedImagesFromZip.js';
import { combinePagesInArchive } from './combinePagesInArchive.js';

const mockExec = vi.mocked(exec);
const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockWriteFileSync = vi.mocked(writeFileSync);
const mockSharp = vi.mocked(sharp);
const mockGetSortedImages = vi.mocked(getSortedImagesFromZip);
const mockExtractPage = vi.mocked(extractPageFromArchive);

const COMIC_PATH = '/comics/batman.cbz';
const COMIC_ID = 42;
const DATA_DIR = '/data';
const PAGES = ['01.png', '02.png', '03.png'];

beforeEach(() => {
  vi.resetAllMocks();

  mockGetSortedImages.mockResolvedValue(PAGES);
  mockExtractPage.mockResolvedValue({ data: Buffer.from('img'), mimeType: 'image/png' });
  mockExistsSync.mockReturnValue(false);
  mockExec.mockImplementation((...args: unknown[]) => {
    const cb = args[args.length - 1] as (err: null, stdout: string, stderr: string) => void;
    cb(null, '', '');
  });

  const chain = {
    metadata: vi.fn().mockResolvedValue({ width: 800, height: 1000 }),
    png: vi.fn(),
    composite: vi.fn(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('combined-image')),
  };
  chain.png.mockReturnValue(chain);
  chain.composite.mockReturnValue(chain);
  mockSharp.mockReturnValue(chain as any);
});

describe('validation', () => {
  it('throws when pageNumber is the last page', async () => {
    await expect(combinePagesInArchive(COMIC_PATH, COMIC_ID, 3, DATA_DIR)).rejects.toThrow(
      'Page 3 cannot be combined',
    );
  });

  it('throws when pageNumber is zero', async () => {
    await expect(combinePagesInArchive(COMIC_PATH, COMIC_ID, 0, DATA_DIR)).rejects.toThrow();
  });

  it('throws when pageNumber exceeds total pages', async () => {
    await expect(combinePagesInArchive(COMIC_PATH, COMIC_ID, 99, DATA_DIR)).rejects.toThrow();
  });

  it('accepts the second-to-last page (last valid combine)', async () => {
    await expect(combinePagesInArchive(COMIC_PATH, COMIC_ID, 2, DATA_DIR)).resolves.toBeDefined();
  });
});

describe('zip command sequence', () => {
  it('removes entry1, adds combined, removes entry2 — in that order', async () => {
    await combinePagesInArchive(COMIC_PATH, COMIC_ID, 1, DATA_DIR);

    const cmds = mockExec.mock.calls.map((args) => args[0] as string);
    expect(cmds).toHaveLength(3);
    expect(cmds[0]).toMatch(/^zip -d ".*batman\.cbz" "01\.png"$/);
    expect(cmds[1]).toMatch(/^cd ".*" && zip ".*batman\.cbz" "01\.png"$/);
    expect(cmds[2]).toMatch(/^zip -d ".*batman\.cbz" "02\.png"$/);
  });

  it('does not remove entry2 before adding the combined image', async () => {
    await combinePagesInArchive(COMIC_PATH, COMIC_ID, 1, DATA_DIR);

    const cmds = mockExec.mock.calls.map((args) => args[0] as string);
    const addIdx = cmds.findIndex((c) => !c.startsWith('zip -d') && c.includes('01.png'));
    const removeEntry2Idx = cmds.findIndex((c) => c.startsWith('zip -d') && c.includes('02.png'));
    expect(addIdx).toBeLessThan(removeEntry2Idx);
  });
});

describe('trash', () => {
  it('writes both original pages to the trash directory', async () => {
    await combinePagesInArchive(COMIC_PATH, COMIC_ID, 1, DATA_DIR);

    const writtenPaths = mockWriteFileSync.mock.calls.map(([p]) => p as string);
    expect(writtenPaths).toContain(`/data/trash/${COMIC_ID}/01.png`);
    expect(writtenPaths).toContain(`/data/trash/${COMIC_ID}/02.png`);
  });

  it('records a combine entry in index.json with correct page metadata', async () => {
    await combinePagesInArchive(COMIC_PATH, COMIC_ID, 1, DATA_DIR);

    const indexCall = mockWriteFileSync.mock.calls.find(([p]) =>
      (p as string).endsWith('index.json'),
    );
    expect(indexCall).toBeDefined();
    const written = JSON.parse(indexCall![1] as string);
    expect(written).toMatchObject({
      comicId: COMIC_ID,
      changes: [
        {
          type: 'combine',
          pageNumber: 1,
          fileName: '01.png',
          pairedPageNumber: 2,
          pairedFileName: '02.png',
        },
      ],
    });
  });

  it('appends to an existing index rather than overwriting it', async () => {
    const existing = {
      comicId: COMIC_ID,
      changes: [
        {
          type: 'delete',
          pageNumber: 5,
          fileName: '05.png',
          deletedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
    };
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(existing));

    await combinePagesInArchive(COMIC_PATH, COMIC_ID, 1, DATA_DIR);

    const indexCall = mockWriteFileSync.mock.calls.find(([p]) =>
      (p as string).endsWith('index.json'),
    );
    const written = JSON.parse(indexCall![1] as string);
    expect(written.changes).toHaveLength(2);
    expect(written.changes[0].type).toBe('delete');
    expect(written.changes[1].type).toBe('combine');
  });
});

it('returns newPageCount one less than the original total', async () => {
  const result = await combinePagesInArchive(COMIC_PATH, COMIC_ID, 1, DATA_DIR);
  expect(result.newPageCount).toBe(PAGES.length - 1);
});
