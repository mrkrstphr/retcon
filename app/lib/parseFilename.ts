import type { ParsedFilename } from '../metadata/providers/types';

/**
 * Parse a comic filename to extract metadata components
 *
 * Handles common patterns:
 * - Series Name #123 (Publisher, Year).cbz
 * - Publisher - Series Name 123.cbz
 * - Series Name v2 #123.cbz
 * - Series Name 123 (Year).cbz
 *
 * Returns partial data on unrecognized formats (won't fail)
 */
export function parseFilename(filename: string): ParsedFilename {
  // Remove file extension
  let name = filename.replace(/\.(cbz|cbr|zip)$/i, '');

  const result: ParsedFilename = {};

  // Extract year in parentheses (2020) or (Year)
  const yearMatch = name.match(/\((\d{4})\)/);
  if (yearMatch) {
    result.year = yearMatch[1];
    name = name.replace(/\(\d{4}\)/, '').trim();
  }

  // Extract publisher in format: (Publisher, Year) or (Publisher)
  const publisherYearMatch = name.match(/\(([^,)]+),\s*(\d{4})\)/);
  if (publisherYearMatch) {
    result.publisher = publisherYearMatch[1].trim();
    result.year = publisherYearMatch[2];
    name = name.replace(/\([^,)]+,\s*\d{4}\)/, '').trim();
  } else {
    const publisherMatch = name.match(/\(([^)]+)\)/);
    if (publisherMatch) {
      const pub = publisherMatch[1].trim();
      // Only use as publisher if it's not a number (could be year)
      if (!/^\d+$/.test(pub)) {
        result.publisher = pub;
      }
      name = name.replace(/\([^)]+\)/, '').trim();
    }
  }

  // Extract volume: v1, v2, Vol 1, Vol. 2, Volume 1, etc.
  const volumeMatch = name.match(/\b(?:v|vol\.?|volume)\s*(\d+)/i);
  if (volumeMatch) {
    result.volume = volumeMatch[1];
    name = name.replace(/\b(?:v|vol\.?|volume)\s*\d+/i, '').trim();
  }

  // Pattern: Publisher - Series Name #123
  const publisherDashMatch = name.match(/^([^-]+)\s*-\s*(.+)$/);
  if (publisherDashMatch && !result.publisher) {
    const potentialPublisher = publisherDashMatch[1].trim();
    const rest = publisherDashMatch[2].trim();

    // Check if the first part looks like a publisher (common names)
    if (
      /^(Marvel|DC|Image|Dark Horse|IDW|Vertigo|Dynamite|Boom|Valiant)/i.test(potentialPublisher)
    ) {
      result.publisher = potentialPublisher;
      name = rest;
    }
  }

  // Extract issue number with # prefix
  const hashNumberMatch = name.match(/#(\d+(?:\.\d+)?)/);
  if (hashNumberMatch) {
    result.number = hashNumberMatch[1];
    name = name.replace(/#\d+(?:\.\d+)?/, '').trim();
  } else {
    // Extract trailing number: "Series Name 123" or "Series Name 123.5"
    const trailingNumberMatch = name.match(/\s+(\d+(?:\.\d+)?)\s*$/);
    if (trailingNumberMatch) {
      result.number = trailingNumberMatch[1];
      name = name.replace(/\s+\d+(?:\.\d+)?\s*$/, '').trim();
    }
  }

  // Extract title after a colon or dash (if issue number was found).
  // Require whitespace before the separator so that hyphens in series names
  // like "Spider-Man" are not mistaken for title separators.
  if (result.number) {
    const titleMatch = name.match(/\s+[-:]\s*(.+)$/);
    if (titleMatch) {
      result.title = titleMatch[1].trim();
      name = name.replace(/\s+[-:]\s*.+$/, '').trim();
    }
  }

  // Whatever's left is the series name
  if (name.length > 0) {
    result.series = name.trim();
  }

  return result;
}

/**
 * Build a search query string from parsed filename
 */
export function buildSearchQuery(parsed: ParsedFilename): string {
  const parts: string[] = [];

  if (parsed.series) {
    parts.push(parsed.series);
  }

  if (parsed.number) {
    parts.push(`#${parsed.number}`);
  }

  if (parsed.volume) {
    parts.push(`v${parsed.volume}`);
  }

  if (parsed.publisher) {
    parts.push(parsed.publisher);
  }

  return parts.join(' ');
}
