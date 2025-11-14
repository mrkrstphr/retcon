export const firstOrNull = async <T>(
  query: Promise<T[]>,
): Promise<T | null> => {
  const result = await query;
  return result[0] || null;
};
