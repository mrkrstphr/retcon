import { searchComics } from '@retcon/common/db/queries';
import type { Route } from './+types/Search';

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const searchTerm = formData.get('search') as string;
  const limit = 25;

  if (!searchTerm || searchTerm.trim() === '') {
    return {
      searchResults: [],
    };
  }

  const [searchResults] = await Promise.all([
    searchComics(searchTerm.trim(), limit, 0),
  ]);

  return {
    searchResults,
  };
}
