export const countOrZero = async <T extends { count: number }>(
  query: Promise<T[]>,
): Promise<number> => {
  const result = await query;
  return result[0]?.count || 0;
};
