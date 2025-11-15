import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { sqidToId } from '~/lib/sqids';
import type { Route } from './+types/Cover';

export async function loader({ params }: Route.LoaderArgs) {
  const { sqid } = params;

  const comicId = sqidToId(sqid);

  const coversDirectory = process.env.COVERS_DIRECTORY;
  if (!coversDirectory) {
    throw new Response('Covers directory not configured', { status: 500 });
  }

  const filePath = join(
    coversDirectory,
    comicId.toString()[0].toLowerCase(),
    `${comicId}.jpg`,
  );

  if (!existsSync(filePath)) {
    throw new Response('Cover not found', { status: 404 });
  }

  try {
    const fileBuffer = await readFile(filePath);

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    });
  } catch (error) {
    throw new Response('Error reading file', { status: 500 });
  }
}
