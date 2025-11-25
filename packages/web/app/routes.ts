import {
  type RouteConfig,
  index,
  layout,
  route,
} from '@react-router/dev/routes';

export default [
  layout('./layouts/Main/Main.tsx', [
    index('routes/Home.tsx'),
    route('publishers', 'routes/Publishers.tsx'),
    route('publishers/:slug', 'routes/PublisherDetails.tsx'),
    route('series/:sqid/:slug', 'routes/SeriesDetails.tsx'),
    route('comic/:sqid/:slug', 'routes/ComicDetails.tsx'),
    route('loose', 'routes/Loose.tsx'),
  ]),
  layout('./layouts/AuthLayout.tsx', [
    route('login', 'routes/Login.tsx'),
    route('setup', 'routes/Setup.tsx'),
  ]),
  route('logout', 'routes/Logout.tsx'),
  route('comic/:sqid/page/:page', 'routes/ComicPage.tsx'),
  route('cover/:sqid', 'routes/Cover.tsx'),
  route('comic/:sqid/read', 'routes/ComicReader.tsx'),
  route('comic/:sqid/progress', 'routes/UserComicProgress.ts'),
  route('issue/:sqid/read', 'routes/MarkIssueReadOrUnread.ts'),
  route('series/:sqid/read', 'routes/MarkSeriesReadOrUnread.ts'),
  route('search', 'routes/Search.tsx'),
] satisfies RouteConfig;
