import { useEffect } from 'react';
import { go, useRoute } from '../../router';

/** Old report links land on the page that took their place, keeping which week or month they meant. */
export function Moved({ to, params: fixed }: { to: string; params?: Record<string, string> }) {
  const { params } = useRoute();
  useEffect(() => {
    const keep: Record<string, string> = { ...fixed };
    for (const k of ['w', 'm']) {
      const v = params.get(k);
      if (v) keep[k] = v;
    }
    go(to, keep, { replace: true });
  }, [to, params, fixed]);
  return null;
}
