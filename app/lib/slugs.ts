/**
 * Generate a URL-safe slug from a publisher name
 * - Converts to lowercase
 * - Removes special characters
 * - Replaces spaces with hyphens
 * - Removes consecutive hyphens
 * - Trims hyphens from start/end
 */
export function createSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Replace spaces, underscores, and multiple whitespace with hyphens
    .replace(/[\s_]+/g, '-')
    // Remove special characters except hyphens and alphanumeric
    .replace(/[^a-z0-9-]/g, '')
    // Remove consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Normalize publisher name for consistent storage and comparison
 */
export function normalizePublisherName(name: string): string {
  return name.trim();
}