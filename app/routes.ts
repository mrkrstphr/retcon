import {
  type RouteConfig,
  index,
  layout,
  route,
} from '@react-router/dev/routes';

export default [
  layout('./Layout.tsx', [
    index('routes/home.tsx'),
    route('comic/:id', 'routes/comic.$id.tsx'),
  ]),
] satisfies RouteConfig;
