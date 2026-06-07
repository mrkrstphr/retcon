import { getComicByIdForUser } from '@retcon/common/db/queries';
import { readFile } from 'fs/promises';
import { join, normalize } from 'path';
import { protectRoute } from '~/lib/protectRoute';
import { sqidToIdOr404 } from '~/lib/sqids';
import type { Route } from './+types/Cover';

export async function loader({ params, request }: Route.LoaderArgs) {
  const { sqid } = params;

  const user = await protectRoute(request);

  const comicId = sqidToIdOr404(sqid, 'Comic');

  const comic = await getComicByIdForUser(comicId, user.id);
  if (!comic) {
    throw new Response('Comic not found', { status: 404 });
  }

  const coversDirectory = `${process.env.DATA_DIRECTORY}/covers`;
  if (!coversDirectory) {
    throw new Response('Covers directory not configured', { status: 500 });
  }

  const subdirectory = comicId.toString()[0];
  if (!/^[0-9]$/.test(subdirectory)) {
    throw new Response('Invalid comic ID', { status: 404 });
  }

  const filePath = join(coversDirectory, subdirectory, `${comicId}.jpg`);

  const normalizedPath = normalize(filePath);
  const normalizedCoversDir = normalize(coversDirectory);
  if (!normalizedPath.startsWith(normalizedCoversDir)) {
    console.error('Path traversal attempt detected:', filePath);
    throw new Response('Invalid path', { status: 400 });
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
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(`Cover not found at path: ${filePath}`);
      throw new Response('Cover not found', { status: 404 });
    }
    console.error('Error reading cover file:', error);
    throw new Response('Error reading file', { status: 500 });
  }
}
