export function formatReleaseDate(dateString?: string): string | null {
  if (!dateString) return null;
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
  if (dateString.match(/^\d{4}-\d{2}$/)) return `${dateString}-01`;
  return null;
}
