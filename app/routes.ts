import {
  type RouteConfig,
  index,
  layout,
  route,
} from '@react-router/dev/routes';

export default [
  layout('./Layout.tsx', [
    index('routes/home.tsx'),
    route('publishers', 'routes/publishers.tsx'),
    route('publishers/:slug', 'routes/publishers.$slug.tsx'),
    route('series/:sqid/:slug', 'routes/SeriesDetails.tsx'),
    route('comic/:id', 'routes/comic.$id.tsx'),
  ]),
] satisfies RouteConfig;
