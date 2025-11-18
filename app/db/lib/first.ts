export const first = async <T>(query: Promise<T[]>): Promise<T> => {
  const result = await query;
  return result[0];
};
