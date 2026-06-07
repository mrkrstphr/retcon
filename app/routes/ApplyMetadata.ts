import {
  getComicById,
  getOrCreatePublisher,
  getOrCreateSeries,
  updateComicMetadataFields,
} from '@retcon/common/db/queries';
import { buildComicInfoXML } from '@retcon/common/lib/comicInfoBuilder';
import { writeComicInfoToZip } from '@retcon/common/lib/writeComicInfo';
import { getProvider } from '@retcon/common/metadata/providers';
import { normalize, resolve } from 'path';
import { protectRoute } from '~/lib/protectRoute';
import { sqidToIdOr404 } from '~/lib/sqids';
import { applyMetadataSchema } from '~/schemas/metadata';
import type { Route } from './+types/ApplyMetadata';

/**
 * POST /comics/:sqid/apply-metadata
 *
 * Apply metadata to a comic file by writing ComicInfo.xml
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
    const validationResult = applyMetadataSchema.safeParse(body);

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

    const { resultId, metadata } = validationResult.data;

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
          error: 'ComicVine API key not configured',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Fetch full details from ComicVine to get publisher and all metadata
    const provider = getProvider(metadata.provider, apiKey);
    const fullMetadata = await provider.getById(resultId);

    if (!fullMetadata) {
      return new Response(
        JSON.stringify({
          error: 'Could not fetch full metadata from provider',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Validate file path is within SCAN_DIRECTORY (security check)
    const scanDirectory = process.env.SCAN_DIRECTORY;
    if (!scanDirectory) {
      return new Response(
        JSON.stringify({ error: 'SCAN_DIRECTORY not configured' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const normalizedScanDir = normalize(resolve(scanDirectory));
    const normalizedFilePath = normalize(resolve(comic.fileName));

    if (!normalizedFilePath.startsWith(normalizedScanDir)) {
      console.log('Normalized Scan Dir:', normalizedScanDir);
      console.log('Normalized File Path:', normalizedFilePath);
      return new Response(
        JSON.stringify({ error: 'File path is outside scan directory' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Build ComicInfo.xml from full metadata
    const xmlContent = buildComicInfoXML(fullMetadata);

    // Write to CBZ file
    await writeComicInfoToZip(comic.fileName, xmlContent);

    // Match publisher and series
    let publisherId: number | null = null;
    let seriesId: number | null = null;

    if (fullMetadata.publisher) {
      publisherId = await getOrCreatePublisher(fullMetadata.publisher);

      // If we have both publisher and series, match/create the series
      if (fullMetadata.series && publisherId) {
        const series = await getOrCreateSeries(
          fullMetadata.series,
          fullMetadata.volume || undefined,
          publisherId,
        );
        seriesId = series?.id || null;
      }
    }

    // Update database with metadata from ComicVine
    await updateComicMetadataFields(comicId, {
      number: fullMetadata.number || null,
      volume: fullMetadata.volume || null,
      releaseDate: fullMetadata.releaseDate || null,
      publisherId,
      seriesId,
      metadata: {
        title: fullMetadata.title,
        summary: fullMetadata.summary,
        writer: fullMetadata.creators?.writer,
        penciller: fullMetadata.creators?.penciller,
        inker: fullMetadata.creators?.inker,
        colorist: fullMetadata.creators?.colorist,
        letterer: fullMetadata.creators?.letterer,
        coverArtist: fullMetadata.creators?.coverArtist,
        editor: fullMetadata.creators?.editor,
        releaseDate: fullMetadata.releaseDate,
      },
    });

    // Return success - comic is now fully matched!
    return new Response(
      JSON.stringify({
        success: true,
        message:
          'Metadata applied successfully! Comic has been matched to publisher and series.',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error: any) {
    console.error('Error applying metadata:', error);

    // Handle specific error types
    if (error.message?.includes('ENOENT')) {
      return new Response(
        JSON.stringify({
          error: 'Comic file not found',
          message: error.message,
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    if (error.message?.includes('EACCES') || error.message?.includes('EPERM')) {
      return new Response(
        JSON.stringify({
          error: 'Permission denied. File may be in use or locked.',
          message: error.message,
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    if (error.message?.includes('ZIP')) {
      return new Response(
        JSON.stringify({
          error: 'Failed to modify comic file. File may be corrupted.',
          message: error.message,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Failed to apply metadata',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
