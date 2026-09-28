import { addDays } from '../domain/dates';
import { fmtInt } from '../domain/format';
import type { Day, FoodEntry, SetEntry, Settings, TrainingSession } from '../domain/types';
import { useAllDays, useAllSets, useEntriesBetween, useSessions, useSettings, useToday } from '../db/hooks';
import { back, go } from '../router';
import { Icon } from '../ui/Icon';
import { MiniRing } from '../ui/Rings';
import { forecastData } from '../state/forecastData';
import { targetsFor } from '../state/derived';

const BAND_LINE = {
  push: 'Every sign points to a good session.',
  steady: 'A solid day. Train as planned.',
  easy: 'Go a little lighter today, or take the short session.',
  rest: 'Rest today. The work is done; now let it land.',
};

/** The forecast on Today: one line a day, weather-app style. */
export function ForecastCard({ settings, today, days, entries, sessions, sets }: { settings: Settings; today: string; days: Day[]; entries: FoodEntry[]; sessions: TrainingSession[]; sets: SetEntry[] }) {
  const fd = forecastData(settings, today, days, entries, sessions, sets);
  const pick = fd.pick;
  if (!pick) return null;
  const hour = new Date().getHours();
  const [first, ...rest] = pick.text.split(/(?<=\.) /);
  return (
    <button type="button" className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }} onClick={() => go('/readiness')}>
      {pick.id === 'records' ? (
        <MiniRing progress={fd.readiness.score / 100} size={72} width={5} label={`Readiness ${fd.readiness.score}`}>
          {String(fd.readiness.score)}
        </MiniRing>
      ) : (
        <div
          className="num"
          style={{ width: 72, height: 72, flexShrink: 0, borderRadius: 36, border: '1.5px solid var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: pick.value.length > 4 ? 15 : 21, color: 'var(--text)', textAlign: 'center', padding: 4 }}
        >
          {pick.value}
        </div>
      )}
      <div className="col gap4" style={{ minWidth: 0 }}>
        <div className="lbl blue">
          {hour >= 15 ? 'Tonight' : 'Today'} · {pick.title}
        </div>
        <div className="t16 lh">{first}</div>
        {rest.length > 0 && <div className="t13 q lh">{rest.join(' ')}</div>}
      </div>
    </button>
  );
}

export function ReadinessPage() {
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  const entries = useEntriesBetween(addDays(today, -2), today);
  const sessions = useSessions();
  const sets = useAllSets();
  if (!settings || !days || !entries || !sessions || !sets) return <div className="page bare" />;
  const fd = forecastData(settings, today, days, entries, sessions, sets);
  const r = fd.readiness;
  const bands = ['rest', 'easy', 'steady', 'push'] as const;
  const scored = sessions.filter((s) => s.status === 'done' && s.readiness !== undefined);
  const share = (pred: (n: number) => boolean) => {
    const ids = new Set(scored.filter((s) => pred(s.readiness!)).map((s) => s.id));
    const xs = sets.filter((x) => ids.has(x.sessionId) && !x.drop);
    return xs.length ? Math.round((xs.filter((x) => x.mark === '!' || x.mark === '!!').length / xs.length) * 100) : undefined;
  };
  const high = share((n) => n >= 80);
  const low = share((n) => n < 60);
  const day = days.find((d) => d.date === today);
  const t = targetsFor(settings, today);
  const cravings = fd.list.some((f) => f.id === 'cravings') ? 'high' : 'low';

  return (
    <div className="page bare">
      <button type="button" className="backlink" onClick={() => back('/today')}>
        <Icon name="left" size={20} stroke={1.8} />
        Today
      </button>
      <div className="col gap12" style={{ alignItems: 'center', textAlign: 'center' }}>
        <div className="lbl blue">Readiness</div>
        <MiniRing progress={r.score / 100} size={150} width={4} label={`Readiness ${r.score}`}>
          {String(r.score)}
        </MiniRing>
        <div className="sf" style={{ fontSize: 26 }}>
          {r.label}
        </div>
        <div className="voice" style={{ fontSize: 16 }}>
          {BAND_LINE[r.band]}
        </div>
        <div className="grid2" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', width: '100%', gap: 6 }}>
          {bands.map((b) => (
            <div key={b} className="col gap4" style={{ alignItems: 'center' }}>
              <div style={{ height: 5, width: '100%', borderRadius: 3, background: b === r.band ? 'var(--blue)' : 'var(--track)' }} />
              <span className={`t12 ${b === r.band ? '' : 'd'}`}>{b.charAt(0).toUpperCase() + b.slice(1)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ gap: 0 }}>
        <div className="lbl" style={{ paddingBottom: 6 }}>
          What went into it
        </div>
        {r.parts.map((p) => (
          <div key={p.name} className="col gap4" style={{ padding: '10px 0', borderTop: '1px solid var(--divider)' }}>
            <div className="row base">
              <span className="t15">{p.name}</span>
              <span className="t14 tn q">
                {p.points} / {p.max}
              </span>
            </div>
            <div className="bar">
              <i style={{ width: `${(p.points / p.max) * 100}%`, background: 'var(--blue)' }} />
            </div>
            {p.note && <span className="t13 q">{p.note}</span>}
          </div>
        ))}
      </div>

      {scored.length >= 10 && (high !== undefined || low !== undefined) && (
        <div className="card">
          <div className="lbl">How well it predicts</div>
          {high !== undefined && (
            <div className="row t15">
              <span>Days at 80 or more</span>
              <span>{high}% of sets beat last time</span>
            </div>
          )}
          {low !== undefined && (
            <div className="row t15">
              <span>Days under 60</span>
              <span>{low}%</span>
            </div>
          )}
          <div className="t13 q lh">Based on your {scored.length} sessions. The model is simple on purpose, so you can see why every point is there.</div>
        </div>
      )}

      <div className="card">
        <div className="lbl">Today's forecast</div>
        <div className="row t15">
          <span>Beat last time</span>
          <span>{fd.sessionDue ? `${fd.beat.pct}% likely` : 'no session due'}</span>
        </div>
        <div className="row t15">
          <span>Records</span>
          <span className="right" style={{ maxWidth: '60%' }}>
            {fd.records.length ? fd.records.map((x) => x.toLowerCase()).join(', ') : 'none due'}
          </span>
        </div>
        <div className="row t15">
          <span>Cravings</span>
          <span>{cravings}</span>
        </div>
        <div className="row t15">
          <span>Steps</span>
          <span>{(day?.steps ?? 0) >= t.steps ? 'goal already closed' : `${fmtInt(t.steps - (day?.steps ?? 0))} to go`}</span>
        </div>
      </div>
      {!fd.beat.learned && <div className="t12 d center lh">The percentage is an estimate until there are ten sessions to learn from.</div>}
      <div className="t12 d center lh">A guide, not a verdict. Train by how you feel, and a joint flag always wins.</div>
    </div>
  );
}
