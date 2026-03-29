import { getComicById } from '@retcon/common/db/queries';
import { getProvider } from '@retcon/common/metadata/providers';
import { parseFilename, buildSearchQuery } from '@retcon/common/lib/parseFilename';
import { basename } from 'path';
import { protectRoute } from '~/lib/protectRoute';
import { sqidToIdOr404 } from '~/lib/sqids';
import type { Route } from './+types/MetadataSearch';

/**
 * POST /comics/:sqid/metadata-search
 *
 * Search for comic metadata using the ComicVine API
 */
export async function action(args: Route.ActionArgs) {
  const { request, params } = args;

  // Require authentication
  await protectRoute(request);

  const { sqid } = params;
  const comicId = sqidToIdOr404(sqid, 'Comic');

  try {
    // Get comic from database
    const comic = await getComicById(comicId);
    if (!comic) {
      return new Response(JSON.stringify({ error: 'Comic not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check for API key
    const apiKey = process.env.COMICVINE_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            'ComicVine API key not configured. Please add COMICVINE_API_KEY to your environment variables.',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Build search query
    let searchQuery: string;
    const contentType = request.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      // Custom query provided by user
      const body = await request.json();
      searchQuery = body.query;
    } else {
      // Build query from existing metadata or filename
      // Priority: series name + number > filename parsing
      if (comic.series && comic.number) {
        // Use series name and issue number if available
        searchQuery = `${comic.series} ${comic.number}`;
      } else {
        // Fall back to parsing filename, but strip directory path
        const filename = basename(comic.fileName);
        const parsed = parseFilename(filename);
        searchQuery = buildSearchQuery(parsed) || '';
      }
    }

    if (!searchQuery) {
      return new Response(
        JSON.stringify({
          error: 'Could not build search query',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Search ComicVine
    const provider = getProvider('comicvine', apiKey);
    const results = await provider.search(searchQuery);

    return new Response(
      JSON.stringify({
        results,
        query: searchQuery,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error: any) {
    console.error('Error searching metadata:', error);

    // Handle rate limiting errors
    if (error.message?.includes('Rate limit')) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        error: 'Failed to search metadata',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
