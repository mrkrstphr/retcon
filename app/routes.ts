import {
  type RouteConfig,
  index,
  layout,
  route,
} from '@react-router/dev/routes';

export default [
  layout('./Layout.tsx', [
    index('routes/Home.tsx'),
    route('publishers', 'routes/Publishers.tsx'),
    route('publishers/:slug', 'routes/PublisherDetails.tsx'),
    route('series/:sqid/:slug', 'routes/SeriesDetails.tsx'),
    route('comic/:id', 'routes/ComicDetails.tsx'),
  ]),
  layout('./AuthLayout.tsx', [route('login', 'routes/Login.tsx')]),
  route('logout', 'routes/Logout.tsx'),
] satisfies RouteConfig;
