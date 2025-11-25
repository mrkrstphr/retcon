function getPagingData(request: Request) {
  const url = new URL(request.url);
  const currentPage = parseInt(url.searchParams.get('page') || '1');
  const itemsPerPage = 25;
  const offset = (currentPage - 1) * itemsPerPage;

  return { currentPage, itemsPerPage, offset };
}

export async function paginateRecords(
  request: Request,
  recordsQuery: (limit: number, offset: number) => Promise<any[]>,
  countQuery: Promise<number>,
) {
  const { currentPage, itemsPerPage, offset } = getPagingData(request);

  const [records, totalRecords] = await Promise.all([
    recordsQuery(itemsPerPage, offset),
    countQuery,
  ]);

  const totalPages = Math.ceil(totalRecords / itemsPerPage);

  return { records, totalRecords, currentPage, itemsPerPage, totalPages };
}
