import type { CSSProperties } from 'react';
import type { Trophy } from '../../domain/trophies';
import { Sect } from '../../ui/kit/Kit';

/** Each trophy in the ink of what it counts, as on Earned (board three). */
const INK: Record<string, string> = { steps: '#8fdcb6', month: '#8fdcb6', perfect: '#f2c46d', records: '#ff9a76', lastmonth: '#93c3dc' };

/** The trophy case (look pass): tiles three across, like Earned's counts on board three. */
export function TrophyCase({ trophies }: { trophies: Trophy[] }) {
  if (!trophies.length) return null;
  return (
    <>
      <Sect>Trophy case</Sect>
      <div className="k-tiles">
        {trophies.map((t) => (
          <div key={t.id} className="k-panel" style={{ '--ink': INK[t.id] ?? '#f2c46d' } as CSSProperties}>
            <span className="k-q">{t.label}</span>
            <b className="k-num ink">{t.value}</b>
          </div>
        ))}
      </div>
    </>
  );
}
