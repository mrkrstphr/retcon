import { XMLBuilder } from 'fast-xml-parser';
import type { MetadataSearchResult } from '../metadata/providers/types';

/**
 * Build a ComicInfo.xml string from metadata search result
 *
 * Follows the ComicInfo.xml schema used by comic readers and managers
 * Reference: https://github.com/anansi-project/comicinfo
 */
export function buildComicInfoXML(metadata: MetadataSearchResult): string {
  // Parse release date if available
  let year: number | undefined;
  let month: number | undefined;
  let day: number | undefined;

  if (metadata.releaseDate) {
    const dateParts = metadata.releaseDate.split('-');
    if (dateParts.length >= 1) year = parseInt(dateParts[0], 10);
    if (dateParts.length >= 2) month = parseInt(dateParts[1], 10);
    if (dateParts.length >= 3) day = parseInt(dateParts[2], 10);
  }

  // Build ComicInfo object
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

  // Add available metadata fields
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

  // Add creators as comma-separated strings
  if (metadata.creators) {
    const { creators } = metadata;

    if (creators.writer?.length) {
      info.Writer = creators.writer.join(', ');
    }
    if (creators.penciller?.length) {
      info.Penciller = creators.penciller.join(', ');
    }
    if (creators.inker?.length) {
      info.Inker = creators.inker.join(', ');
    }
    if (creators.colorist?.length) {
      info.Colorist = creators.colorist.join(', ');
    }
    if (creators.letterer?.length) {
      info.Letterer = creators.letterer.join(', ');
    }
    if (creators.coverArtist?.length) {
      info.CoverArtist = creators.coverArtist.join(', ');
    }
    if (creators.editor?.length) {
      info.Editor = creators.editor.join(', ');
    }
  }

  // Add note about the source
  info.Notes = `Metadata from ${metadata.provider} (ID: ${metadata.id})`;

  // Build XML
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true,
    indentBy: '  ',
    suppressEmptyNode: true,
  });

  return builder.build(comicInfo);
}
