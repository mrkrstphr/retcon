import { getProvider } from '@retcon/common/metadata/providers';
import { z } from 'zod';
import { protectRoute } from '~/lib/protectRoute';
import { sqidToIdOr404 } from '~/lib/sqids';
import type { Route } from './+types/FetchMetadata';

/**
 * Schema for fetching full metadata
 */
const fetchMetadataSchema = z.object({
  resultId: z.string(),
  provider: z.string(),
});

/**
 * POST /comics/:sqid/fetch-metadata
 *
 * Fetch full metadata from provider (ComicVine) by ID
 * Returns complete metadata including publisher, creators, etc.
 */
export async function action(args: Route.ActionArgs) {
  const { request, params } = args;

  // Require authentication
  await protectRoute(request);

  const { sqid } = params;
  const comicId = sqidToIdOr404(sqid, 'Comic');

  try {
    // Parse request body
    const body = await request.json();
    const validationResult = fetchMetadataSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request body',
          details: validationResult.error.issues,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const { resultId, provider } = validationResult.data;

    // Check for API key
    const apiKey = process.env.COMICVINE_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'ComicVine API key not configured',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Fetch full metadata from ComicVine
    const metadataProvider = getProvider(provider, apiKey);
    const fullMetadata = await metadataProvider.getById(resultId);

    if (!fullMetadata) {
      return new Response(
        JSON.stringify({
          error: 'Could not fetch metadata from provider',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        fullMetadata,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error: any) {
    console.error('Error fetching metadata:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch metadata',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
