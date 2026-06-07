/**
 * Metadata provider interface for extensible comic metadata sources
 */
export interface MetadataProvider {
  /** Provider name (e.g., 'comicvine', 'marvel') */
  name: string;

  /** Search for comics matching the query */
  search(query: string): Promise<MetadataSearchResult[]>;

  /** Get specific comic metadata by provider ID */
  getById(id: string): Promise<MetadataSearchResult | null>;
}

/**
 * Standardized metadata search result from any provider
 */
export interface MetadataSearchResult {
  /** Provider this result came from */
  provider: string;

  /** Provider-specific ID */
  id: string;

  /** Series name */
  series: string;

  /** Volume number or year */
  volume?: string;

  /** Issue number */
  number?: string;

  /** Issue title */
  title?: string;

  /** Publisher name */
  publisher?: string;

  /** Release date (YYYY-MM-DD format) */
  releaseDate?: string;

  /** Issue summary/description */
  summary?: string;

  /** Cover image URL */
  coverUrl?: string;

  /** Creator credits */
  creators?: {
    writer?: string[];
    penciller?: string[];
    inker?: string[];
    colorist?: string[];
    letterer?: string[];
    coverArtist?: string[];
    editor?: string[];
  };
}

/**
 * Parsed filename components
 */
export interface ParsedFilename {
  series?: string;
  number?: string;
  volume?: string;
  publisher?: string;
  year?: string;
  title?: string;
}
