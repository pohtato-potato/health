import { fmtInt } from '../../domain/format';
import { positionAt } from '../../domain/walk';
import type { WeekWalk } from '../../walk/week';

const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** The Monday story's walk card: the week's km, where it took you, what you reached, and the routes you walked. */
export function WeekRoadCard({ w }: { w: WeekWalk }) {
  if (w.km < 0.5) return null;
  const a = positionAt(w.fromKm).from.name;
  const b = positionAt(w.toKm).from.name;
  return (
    <div className="card" style={{ gap: 8 }}>
      <div className="lbl" style={{ color: 'var(--sage)' }}>
        On the road
      </div>
      <div className="row" style={{ alignItems: 'baseline', gap: 8, justifyContent: 'flex-start' }}>
        <span className="num" style={{ fontSize: 28 }}>
          {fmtInt(w.km)}
        </span>
        <span className="t15">km, {a === b ? `around ${b}` : `${a} to ${b}`}</span>
      </div>
      {(w.cities.length > 0 || w.states.length > 0) && (
        <div className="t15 lh">
          {w.cities.length > 0 && `Reached ${list(w.cities)}. `}
          {w.states.length > 0 && `Into ${list(w.states)}.`}
        </div>
      )}
      {w.routes.map((r) => (
        <div key={r.id} className="row t14" style={{ gap: 8 }}>
          <span className="grow">{r.name}</span>
          <span className="q">
            {fmtInt(r.km)} km{r.done ? ' · finished' : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
