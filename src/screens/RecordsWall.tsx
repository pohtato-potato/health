import { fmtDayMonth } from '../domain/format';
import { fmtKg } from '../domain/loads';
import { allExercises } from '../domain/plan';
import { medalsFor, type Medal } from '../domain/records';
import { useAllSets, useSettings } from '../db/hooks';
import { back } from '../router';
import { Icon } from '../ui/Icon';

const MEDAL_INK: Record<Medal, string> = { gold: 'var(--gold)', silver: '#c9c6d6', bronze: '#d39a6e' };

/** Every exercise's three best sets, by clean reps times load. */
export function RecordsWall() {
  const settings = useSettings();
  const sets = useAllSets();
  if (!settings?.plan || !sets) return <div className="page bare" />;
  const rows = allExercises(settings.plan)
    .map((ex) => ({ ex, medals: medalsFor(ex, sets) }))
    .filter((r) => r.medals.length)
    .sort((a, b) => b.medals[0].score - a.medals[0].score);

  return (
    <div className="page bare">
      <button type="button" className="backlink" onClick={() => back('/train')}>
        <Icon name="left" size={20} stroke={1.8} />
        Train
      </button>
      <h1 className="h1">Records</h1>
      <div className="t14 q lh">The three best sessions for each exercise, counted in clean reps times the weight.</div>
      {rows.length === 0 && <div className="t15 q">Records appear after your first sessions.</div>}
      {rows.map(({ ex, medals }) => (
        <div key={ex.id} className="card" style={{ gap: 8 }}>
          <div className="t17">{ex.name}</div>
          {medals.map((m) => (
            <div key={m.medal} className="row base" style={{ minHeight: 32 }}>
              <span className="row" style={{ gap: 10, justifyContent: 'flex-start' }}>
                <i className="medal" style={{ background: MEDAL_INK[m.medal] }} aria-label={m.medal} />
                <span className="t15 tn">
                  {m.loadKg !== null ? `${fmtKg(m.loadKg)} kg × ` : ''}
                  {m.reps}
                  {m.clean < m.reps ? <span className="t12 q"> · {m.clean} clean</span> : null}
                </span>
              </span>
              <span className="t13 q">{fmtDayMonth(m.date)}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
