import type { StopKind } from '../content/types';

/** Each kind of small stop's mark, on a 24-unit grid; always shown with its word. */
const PATHS: Record<StopKind, string> = {
  river: 'M2 9 Q6 6 10 9 T18 9 T22 9 M2 14 Q6 11 10 14 T18 14 T22 14 M2 19 Q6 16 10 19 T18 19 T22 19',
  border: 'M5 21 V3 M5 4 H17 L14 8 L17 12 H5 M12 21 h-2 M16 21 h-2 M20 21 h-2',
  food: 'M4 12 h16 a8 8 0 0 1 -16 0 Z M8 8 q1 -2 0 -4 M12 8 q1 -2 0 -4 M16 8 q1 -2 0 -4',
  fort: 'M3 21 V9 h3 V6 h3 v3 h6 V6 h3 v3 h3 v12 Z M10 21 v-5 a2 2 0 0 1 4 0 v5',
  wildlife: 'M6 9 a2 2 0 1 0 0.01 0 M10 5 a2 2 0 1 0 0.01 0 M14 5 a2 2 0 1 0 0.01 0 M18 9 a2 2 0 1 0 0.01 0 M8 17 q4 -8 8 0 q0 3 -4 3 q-4 0 -4 -3 Z',
  strange: 'M12 2 a10 10 0 1 0 0.01 0 M9 9 a3 3 0 1 1 4 2.8 q-1 0.6 -1 2.2 M12 17.5 v0.5',
};

export function StopMark({ kind }: { kind: StopKind }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="walk-mark">
      <path d={PATHS[kind]} />
    </svg>
  );
}
