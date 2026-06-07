import { ComicVineProvider } from './comicvine';
import type { MetadataProvider } from './types';

export { ComicVineProvider } from './comicvine';
export * from './types';

/**
 * Get a metadata provider by name
 *
 * @param name Provider name
 * @param apiKey API key for the provider
 * @returns MetadataProvider instance
 * @throws Error if provider is unknown or API key is missing
 */
export function getProvider(name: string, apiKey: string): MetadataProvider {
  switch (name.toLowerCase()) {
    case 'comicvine':
      return new ComicVineProvider(apiKey);
    default:
      throw new Error(`Unknown metadata provider: ${name}`);
  }
}

/**
 * Get list of supported provider names
 */
export function getSupportedProviders(): string[] {
  return ['comicvine'];
}
