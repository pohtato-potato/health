// Buildings rise (motion board two, O44): a project drawn as a tower of storeys, one per counted day (scaled to at
// most 8). Storeys counted since you last looked rise one by one; when every day is in, the lights come on.
import type { CSSProperties } from 'react';
import { useSeenBefore } from './motion';

const MAX = 8;
export function towerOf(have: number, of: number): { storeys: number; on: number } {
  const storeys = Math.max(1, Math.min(MAX, of));
  return { storeys, on: of <= 0 ? 0 : Math.min(storeys, Math.floor((have / of) * storeys + 1e-9)) };
}

export function Tower({ id, have, of, c }: { id: string; have: number; of: number; c: string }) {
  const { storeys, on } = towerOf(have, of);
  const lit = of > 0 && have >= of;
  const before = useSeenBefore<number>(`tower:${id}`, on);
  const from = before === undefined ? on : Math.min(before, on);
  const litNew = lit && before !== undefined && before < storeys;
  return (
    <span className={`mo-tower${lit ? ' lit' : ''}${litNew ? ' new-lit' : ''}`} style={{ '--c': c, ...(litNew ? { '--d': `${(on - from) * 140 + 200}ms` } : {}) } as CSSProperties} aria-hidden="true">
      {Array.from({ length: storeys }, (_, i) => (
        <i key={i} className={`${i < on ? 'on' : ''}${i >= from && i < on ? ' new' : ''}`} style={i >= from && i < on ? ({ '--d': `${(i - from) * 140 + 200}ms` } as CSSProperties) : undefined} />
      ))}
    </span>
  );
}
