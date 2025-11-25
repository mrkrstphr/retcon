export const generatePageUrl = (page: number) => {
  const params = new URLSearchParams();
  if (page > 1) params.set('page', page.toString());
  return params.toString() ? `?${params.toString()}` : '';
};
