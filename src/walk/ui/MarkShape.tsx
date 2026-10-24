import type { ReactNode } from 'react';
import type { Mark } from '../catalogue';

const PATHS: Record<Mark, string> = {
  seal: 'M12 2 a10 10 0 1 0 0.01 0 M7 8 h10 M8 12 h8 M7 16 h10 M12 5 v14',
  crystal: 'M12 2 L19 9 L12 22 L5 9 Z M5 9 h14 M12 2 v20',
  minar: 'M10 22 L10.8 5 Q12 2 13.2 5 L14 22 Z M8 22 h8 M10.6 9 h2.8 M10.4 14 h3.2',
  station: 'M4 10 L12 4 L20 10 M6 10 v10 h12 v-10 M10 20 v-5 h4 v5',
  milecastle: 'M5 21 V9 h3 V6 h3 v3 h2 V6 h3 v3 h3 v12 Z M10 21 v-5 h4 v5',
  postcard: 'M3 6 h18 v13 H3 Z M14 9 h4 v4 h-4 Z M5 11 h6 M5 14 h6',
  elephant: 'M4 18 V11 Q4 6 10 6 h5 Q20 6 20 11 V13 Q20 16 18 16 V20 M4 18 h3 v-4 M15 18 v-3 M20 13 Q22 15 21 19',
  walker: 'M12 4 a2 2 0 1 0 0.01 0 M12 8 v6 M12 14 l-3 7 M12 14 l3 7 M12 10 l-4 3 M12 10 l4 3',
  island: 'M2 18 Q8 10 12 12 T22 18 Z M8 14 l2 -5 l3 4',
  moon: 'M15 3 a9 9 0 1 0 6 13 a7 7 0 1 1 -6 -13 Z',
  shield: 'M12 2 L20 6 V12 Q20 18 12 22 Q4 18 4 12 V6 Z M12 7 v10 M8 11 h8',
  house: 'M3 11 L12 4 L21 11 M5 10 V20 H19 V10 M10 20 v-6 h4 v6',
  stage: 'M12 2 a10 10 0 1 0 0.01 0 M12 6 v6 l4 3',
  chapter: 'M5 4 h10 l4 4 v12 H5 Z M15 4 v4 h4 M8 12 h8 M8 15 h8 M8 18 h5',
  stone: 'M6 22 V9 a6 6 0 0 1 12 0 V22 Z M6 11 h12',
};

/** A mark's drawing alone, on a 24-unit grid, for placing inside another drawing. */
export function markPath(mark: Mark): ReactNode {
  return <path d={PATHS[mark]} />;
}

/** The small drawn mark a route's collection is made of, in its own svg. */
export function MarkShape({ mark }: { mark: Mark }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="walk-mark">
      {markPath(mark)}
    </svg>
  );
}
