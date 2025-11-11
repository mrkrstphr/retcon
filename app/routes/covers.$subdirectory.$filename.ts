import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { type LoaderFunctionArgs } from 'react-router';

export async function loader({ params }: LoaderFunctionArgs) {
  const { subdirectory, filename } = params;

  if (!subdirectory || !filename) {
    throw new Response('Not Found', { status: 404 });
  }

  const coversDirectory = process.env.COVERS_DIRECTORY;
  if (!coversDirectory) {
    throw new Response('Covers directory not configured', { status: 500 });
  }

  const filePath = join(coversDirectory, subdirectory, filename);

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
