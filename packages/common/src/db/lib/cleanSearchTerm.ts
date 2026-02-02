export const cleanSearchTerm = (searchTerm: string): string => {
  return searchTerm
    .trim()
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .toLowerCase();
};
