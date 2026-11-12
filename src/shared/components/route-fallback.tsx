import { PageSkeleton } from '@/shared/components/skeletons';

/**
 * `Suspense` fallback for lazy-loaded route screens: a page-shaped skeleton,
 * the same treatment as every other first load.
 */
export function RouteFallback() {
  return <PageSkeleton />;
}
