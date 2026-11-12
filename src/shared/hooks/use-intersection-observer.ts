import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Fires `onIntersect` whenever the returned ref's element enters the
 * viewport (of `root`, or the nearest scrollable ancestor by default) —
 * the standard "load more" sentinel for infinite-scroll lists.
 */
export function useIntersectionObserver<T extends Element>(
  onIntersect: () => void,
  {
    enabled = true,
    root = null,
  }: { enabled?: boolean; root?: Element | null } = {},
) {
  const targetRef = useRef<T>(null);
  const onIntersectRef = useRef(onIntersect);
  useLayoutEffect(() => {
    onIntersectRef.current = onIntersect;
  });

  useEffect(() => {
    if (!enabled) return;
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onIntersectRef.current();
      },
      { root, rootMargin: '200px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [enabled, root]);

  return targetRef;
}
