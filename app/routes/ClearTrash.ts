import { existsSync, readdirSync, unlinkSync } from 'fs';
import { rm } from 'fs/promises';
import { join } from 'path';
import { data } from 'react-router';
import { protectRoute } from '~/lib/protectRoute';
import { sqidToIdOr404 } from '~/lib/sqids';
import type { Route } from './+types/ClearTrash';

export async function action({ params, request }: Route.ActionArgs) {
  await protectRoute(request);

  if (request.method !== 'POST') {
    return data({ error: 'Method not allowed' }, { status: 405 });
  }

  const { sqid } = params;
  if (!sqid) {
    return data({ error: 'Missing parameters' }, { status: 400 });
  }

  const comicId = sqidToIdOr404(sqid, 'Comic');

  const dataDirectory = process.env.DATA_DIRECTORY;
  if (!dataDirectory) {
    return data({ error: 'DATA_DIRECTORY not configured' }, { status: 500 });
  }

  const trashDir = join(dataDirectory, 'trash', String(comicId));
  if (!existsSync(trashDir)) {
    return data({ success: true }, { status: 200 });
  }

  try {
    await rm(trashDir, { recursive: true, force: true });
    return data({ success: true }, { status: 200 });
  } catch (error) {
    console.error(`Error clearing trash for comic ${comicId}:`, error);
    return data(
      {
        error: 'Failed to clear trash',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
