import {
  getComicById,
  getOrCreatePublisher,
  getOrCreateSeries,
  updateComicMetadataFields,
} from '@retcon/common/db/queries';
import { writeComicInfoToZip } from '@retcon/common/lib/writeComicInfo';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import StreamZip from 'node-stream-zip';
import { normalize, resolve } from 'path';
import { z } from 'zod';
import { protectRoute } from '~/lib/protectRoute';
import { sqidToIdOr404 } from '~/lib/sqids';
import type { Route } from './+types/MetadataEdit';

const splitToMany = (str: string | undefined) =>
  str
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const joinFromMany = (arr: string[] | undefined) =>
  arr && arr.length > 0 ? arr.join(', ') : undefined;

/**
 * Schema for manual metadata editing
 * Coerce numbers to strings and transform empty strings to undefined
 */
const editMetadataSchema = z.object({
  metadata: z.object({
    series: z
      .string()
      .optional()
      .transform((val) => (val === '' ? undefined : val)),
    number: z.coerce
      .string()
      .optional()
      .transform((val) => (val === '' ? undefined : val)),
    volume: z.coerce
      .string()
      .optional()
      .transform((val) => (val === '' ? undefined : val)),
    title: z
      .string()
      .optional()
      .transform((val) => (val === '' ? undefined : val)),
    publisher: z
      .string()
      .optional()
      .transform((val) => (val === '' ? undefined : val)),
    summary: z
      .string()
      .optional()
      .transform((val) => (val === '' ? undefined : val)),
    releaseDate: z
      .string()
      .optional()
      .transform((val) => (val === '' ? undefined : val)),
    writer: z
      .string()
      .optional()
      .transform((val) => (val === '' ? undefined : val)),
    penciller: z
      .string()
      .optional()
      .transform((val) => (val === '' ? undefined : val)),
    inker: z
      .string()
      .optional()
      .transform((val) => (val === '' ? undefined : val)),
    colorist: z
      .string()
      .optional()
      .transform((val) => (val === '' ? undefined : val)),
    letterer: z
      .string()
      .optional()
      .transform((val) => (val === '' ? undefined : val)),
    coverArtist: z
      .string()
      .optional()
      .transform((val) => (val === '' ? undefined : val)),
    editor: z
      .string()
      .optional()
      .transform((val) => (val === '' ? undefined : val)),
  }),
  source: z
    .object({
      provider: z.string(),
      id: z.string(),
    })
    .optional(),
});

/**
 * GET /comics/:sqid/metadata-edit
 *
 * Load existing metadata from ComicInfo.xml for editing
 */
export async function loader(args: Route.LoaderArgs) {
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

    // Read ComicInfo.xml from the CBZ file
    let metadata: any = {};

    try {
      const zip = new StreamZip.async({ file: comic.fileName });
      const entries = await zip.entries();

      const comicInfoEntry = Object.values(entries).find(
        (entry) => entry.name.toLowerCase() === 'comicinfo.xml',
      );

      if (comicInfoEntry) {
        const xmlData = await zip.entryData(comicInfoEntry);
        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: '@_',
        });

        const result = parser.parse(xmlData.toString());

        if (result.ComicInfo) {
          const info = result.ComicInfo;

          // Build release date from Year/Month/Day
          const releaseDate = [
            info.Year,
            info.Month?.toString().padStart(2, '0'),
            info.Day?.toString().padStart(2, '0'),
          ]
            .filter(Boolean)
            .join('-');

          metadata = {
            series: info.Series?.toString() || '',
            number: info.Number?.toString() || '',
            volume: info.Volume?.toString() || '',
            title: info.Title?.toString() || '',
            publisher: info.Publisher?.toString() || '',
            summary: info.Summary?.toString() || '',
            releaseDate: releaseDate || '',
            writer: joinFromMany(splitToMany(info.Writer)),
            penciller: joinFromMany(splitToMany(info.Penciller)),
            inker: joinFromMany(splitToMany(info.Inker)),
            colorist: joinFromMany(splitToMany(info.Colorist)),
            letterer: joinFromMany(splitToMany(info.Letterer)),
            coverArtist: joinFromMany(splitToMany(info.CoverArtist)),
            editor: joinFromMany(splitToMany(info.Editor)),
          };
        }
      }

      await zip.close();
    } catch (zipError: any) {
      console.error('Error reading ComicInfo.xml:', zipError);
      // Return empty metadata if file can't be read
    }

    return new Response(JSON.stringify({ metadata }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error loading metadata for editing:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to load metadata',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}

/**
 * POST /comics/:sqid/metadata-edit
 *
 * Save manually edited metadata to ComicInfo.xml
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
    const validationResult = editMetadataSchema.safeParse(body);

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

    const { metadata, source } = validationResult.data;

    // Get comic from database
    const comic = await getComicById(comicId);
    if (!comic) {
      return new Response(JSON.stringify({ error: 'Comic not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate file path is within SCAN_DIRECTORY (security check)
    const scanDirectory = process.env.SCAN_DIRECTORY;
    if (!scanDirectory) {
      return new Response(JSON.stringify({ error: 'SCAN_DIRECTORY not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const normalizedScanDir = normalize(resolve(scanDirectory));
    const normalizedFilePath = normalize(resolve(comic.fileName));

    if (!normalizedFilePath.startsWith(normalizedScanDir)) {
      return new Response(JSON.stringify({ error: 'File path is outside scan directory' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse release date
    let year: number | undefined;
    let month: number | undefined;
    let day: number | undefined;

    if (metadata.releaseDate) {
      const dateParts = metadata.releaseDate.split('-');
      if (dateParts.length >= 1) year = parseInt(dateParts[0], 10);
      if (dateParts.length >= 2) month = parseInt(dateParts[1], 10);
      if (dateParts.length >= 3) day = parseInt(dateParts[2], 10);
    }

    // Build ComicInfo.xml
    const comicInfo: any = {
      '?xml': {
        '@_version': '1.0',
        '@_encoding': 'utf-8',
      },
      ComicInfo: {
        '@_xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        '@_xmlns:xsd': 'http://www.w3.org/2001/XMLSchema',
      },
    };

    const info = comicInfo.ComicInfo;

    // Add metadata fields
    if (metadata.series) info.Series = metadata.series;
    if (metadata.number) info.Number = metadata.number;
    if (metadata.volume) info.Volume = metadata.volume;
    if (metadata.title) info.Title = metadata.title;
    if (metadata.publisher) info.Publisher = metadata.publisher;
    if (metadata.summary) info.Summary = metadata.summary;

    // Add date components
    if (year) info.Year = year;
    if (month) info.Month = month;
    if (day) info.Day = day;

    // Add creators
    if (metadata.writer) info.Writer = metadata.writer;
    if (metadata.penciller) info.Penciller = metadata.penciller;
    if (metadata.inker) info.Inker = metadata.inker;
    if (metadata.colorist) info.Colorist = metadata.colorist;
    if (metadata.letterer) info.Letterer = metadata.letterer;
    if (metadata.coverArtist) info.CoverArtist = metadata.coverArtist;
    if (metadata.editor) info.Editor = metadata.editor;

    // Add note about source
    if (source) {
      info.Notes = `Metadata from ${source.provider} (ID: ${source.id})`;
    } else {
      info.Notes = 'Manually edited metadata';
    }

    // Build XML
    const builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      format: true,
      indentBy: '  ',
      suppressEmptyNode: true,
    });

    const xmlContent = builder.build(comicInfo);

    // Write to CBZ file
    await writeComicInfoToZip(comic.fileName, xmlContent);

    // Match publisher and series in database
    let publisherId: number | null = null;
    let seriesId: number | null = null;

    if (metadata.publisher) {
      publisherId = await getOrCreatePublisher(metadata.publisher);

      // If we have both publisher and series, match/create the series
      if (metadata.series && publisherId) {
        const series = await getOrCreateSeries(
          metadata.series,
          metadata.volume || undefined,
          publisherId,
        );
        seriesId = series?.id || null;
      }
    }

    // Update database
    await updateComicMetadataFields(comicId, {
      number: metadata.number || null,
      volume: metadata.volume || null,
      releaseDate: metadata.releaseDate || null,
      publisherId,
      seriesId,
      metadata: {
        title: metadata.title,
        summary: metadata.summary,
        writer: splitToMany(metadata.writer),
        penciller: splitToMany(metadata.penciller),
        inker: splitToMany(metadata.inker),
        colorist: splitToMany(metadata.colorist),
        letterer: splitToMany(metadata.letterer),
        coverArtist: splitToMany(metadata.coverArtist),
        editor: splitToMany(metadata.editor),
        releaseDate: metadata.releaseDate,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Metadata saved successfully!',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error: any) {
    console.error('Error saving metadata:', error);

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
        error: 'Failed to save metadata',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
