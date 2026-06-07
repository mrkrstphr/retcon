import { RateLimiter } from '../../lib/rateLimiter';
import type { MetadataProvider, MetadataSearchResult } from './types';

/**
 * ComicVine API provider for comic metadata
 *
 * API Documentation: https://comicvine.gamespot.com/api/
 * Rate limits: 200 requests per hour per resource
 */
export class ComicVineProvider implements MetadataProvider {
  name = 'comicvine';
  private readonly apiKey: string;
  private readonly baseUrl = 'https://comicvine.gamespot.com/api';
  private readonly rateLimiter: RateLimiter;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('ComicVine API key is required');
    }
    this.apiKey = apiKey;
    // 200 requests per hour = 3600000ms
    this.rateLimiter = new RateLimiter(200, 3600000);
  }

  /**
   * Search for comics matching the query
   */
  async search(query: string): Promise<MetadataSearchResult[]> {
    this.rateLimiter.recordRequest();

    const url = new URL(`${this.baseUrl}/search/`);
    url.searchParams.set('api_key', this.apiKey);
    url.searchParams.set('format', 'json');
    url.searchParams.set('resources', 'issue');
    url.searchParams.set('query', query);
    url.searchParams.set(
      'field_list',
      'id,name,volume,issue_number,cover_date,description,image',
    );
    url.searchParams.set('limit', '25');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Retcon Comic Manager/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`ComicVine API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error !== 'OK') {
      throw new Error(`ComicVine API error: ${data.error}`);
    }

    return data.results.map((result: any) => this.mapToMetadataResult(result));
  }

  /**
   * Get specific comic metadata by ComicVine issue ID
   */
  async getById(id: string): Promise<MetadataSearchResult | null> {
    this.rateLimiter.recordRequest();

    const url = new URL(`${this.baseUrl}/issue/4000-${id}/`);
    url.searchParams.set('api_key', this.apiKey);
    url.searchParams.set('format', 'json');
    url.searchParams.set(
      'field_list',
      'id,name,volume,issue_number,cover_date,description,image,person_credits',
    );

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Retcon Comic Manager/1.0',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`ComicVine API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error !== 'OK') {
      throw new Error(`ComicVine API error: ${data.error}`);
    }

    const issue = data.results;

    // Fetch full volume details to get publisher and start_year
    if (issue.volume?.id) {
      const volumeDetails = await this.getVolumeDetails(issue.volume.id);
      if (volumeDetails) {
        // Merge volume details into issue
        issue.volume = {
          ...issue.volume,
          ...volumeDetails,
        };
      }
    }

    return this.mapToMetadataResult(issue);
  }

  /**
   * Get volume details including publisher and start_year
   */
  private async getVolumeDetails(
    volumeId: number,
  ): Promise<{ publisher: any; start_year: number } | null> {
    this.rateLimiter.recordRequest();

    const url = new URL(`${this.baseUrl}/volume/4050-${volumeId}/`);
    url.searchParams.set('api_key', this.apiKey);
    url.searchParams.set('format', 'json');
    url.searchParams.set('field_list', 'id,name,publisher,start_year');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Retcon Comic Manager/1.0',
      },
    });

    if (!response.ok) {
      console.warn(
        `Failed to fetch volume ${volumeId}: ${response.statusText}`,
      );
      return null;
    }

    const data = await response.json();

    if (data.error !== 'OK') {
      console.warn(`ComicVine API error for volume ${volumeId}: ${data.error}`);
      return null;
    }

    return {
      publisher: data.results.publisher,
      start_year: data.results.start_year,
    };
  }

  /**
   * Map ComicVine API response to standardized metadata result
   */
  private mapToMetadataResult(result: any): MetadataSearchResult {
    // Strip HTML from description
    const summary = result.description
      ? this.stripHtml(result.description)
      : undefined;

    // Parse person credits if available
    const creators: MetadataSearchResult['creators'] = {};
    if (result.person_credits && Array.isArray(result.person_credits)) {
      const creditsByRole = this.groupCreditsByRole(result.person_credits);

      if (creditsByRole.writer?.length) creators.writer = creditsByRole.writer;
      if (creditsByRole.penciller?.length)
        creators.penciller = creditsByRole.penciller;
      if (creditsByRole.inker?.length) creators.inker = creditsByRole.inker;
      if (creditsByRole.colorist?.length)
        creators.colorist = creditsByRole.colorist;
      if (creditsByRole.letterer?.length)
        creators.letterer = creditsByRole.letterer;
      if (creditsByRole['cover artist']?.length)
        creators.coverArtist = creditsByRole['cover artist'];
      if (creditsByRole.editor?.length) creators.editor = creditsByRole.editor;
    }

    return {
      provider: 'comicvine',
      id: result.id.toString(),
      series: result.volume?.name || '',
      volume: result.volume?.start_year?.toString(),
      number: result.issue_number,
      title: result.name || undefined,
      publisher: result.volume?.publisher?.name || undefined,
      releaseDate: result.cover_date || undefined,
      summary,
      coverUrl: result.image?.small_url || result.image?.thumb_url || undefined,
      creators: Object.keys(creators).length > 0 ? creators : undefined,
    };
  }

  /**
   * Strip HTML tags from text
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Group person credits by role
   */
  private groupCreditsByRole(credits: any[]): Record<string, string[]> {
    const grouped: Record<string, string[]> = {};

    for (const credit of credits) {
      const role = credit.role?.toLowerCase() || 'unknown';
      const name = credit.name;

      if (!name) continue;

      if (!grouped[role]) {
        grouped[role] = [];
      }

      if (!grouped[role].includes(name)) {
        grouped[role].push(name);
      }
    }

    return grouped;
  }

  /**
   * Get remaining API requests in current window
   */
  getRemainingRequests(): number {
    return this.rateLimiter.getRemainingRequests();
  }
}
