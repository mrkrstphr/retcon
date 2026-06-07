export const generatePageUrl = (page: number) => {
  // TODO: get the URL here somehow to preserve existing params
  // needs to wrk both client and server side

  const params = new URLSearchParams();
  if (page > 1) params.set('page', page.toString());
  return params.toString() ? `?${params.toString()}` : '';
};
