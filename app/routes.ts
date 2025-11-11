import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('comic/:id', 'routes/comic.$id.tsx'),
] satisfies RouteConfig;
