import { useState } from 'react';
import { patchSettings } from '../db/actions';
import { useAllDays, useAllEntries, useSessions, useSettings, useToday } from '../db/hooks';
import { addDays, daysBetween } from '../domain/dates';
import { EXPERIMENT_METRICS, experimentResult, experimentValues, experimentWindows, MIN_EXPERIMENT_DAYS, type ExperimentMetric } from '../domain/experiments';
import { fmtDayMonth, fmtInt } from '../domain/format';
import type { Experiment } from '../domain/types';
import { back } from '../router';
import { Icon } from '../ui/Icon';

const VERDICT = { up: 'went up', down: 'went down', same: 'stayed within the usual noise' };

/** Personal experiments: change one thing, and see whether a measure really moved against the days before. */
export function ExperimentsPage() {
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  const entries = useAllEntries();
  const sessions = useSessions();
  const [question, setQuestion] = useState('');
  const [metric, setMetric] = useState<ExperimentMetric>('sleep');
  if (!settings || !days || !entries || !sessions) return <div className="page bare" />;
  const list = [...(settings.experiments ?? [])].sort((a, b) => b.from.localeCompare(a.from));
  const save = (next: Experiment[]) => patchSettings({ experiments: next });

  return (
    <div className="page bare">
      <button type="button" className="backlink" onClick={() => back('/you')}>
        <Icon name="left" size={20} stroke={1.8} />
        You
      </button>
      <div className="col gap4">
        <h1 className="h1">Experiments</h1>
        <div className="t14 q lh">Change one thing for a few weeks. The answer compares those days with the same number just before, and only speaks once each side has {MIN_EXPERIMENT_DAYS} days.</div>
      </div>

      {list.map((x) => {
        const values = experimentValues(x.metric, { days, entries, sessions });
        const w = experimentWindows(x.from, x.to, today, values);
        const r = experimentResult(w.before, w.during);
        const running = !x.to || x.to >= today;
        const fmt = (v: number) => (x.metric === 'sleep' ? `${Math.floor(v / 60)} h ${Math.round(v % 60)} m` : fmtInt(v));
        return (
          <div key={x.id} className="card">
            <div className="row top">
              <span className="t16 lh">{x.question}</span>
              <span className={`t12 ${running ? 'sage' : 'q'}`}>{running ? `day ${daysBetween(x.from, today) + 1}` : 'ended'}</span>
            </div>
            <div className="t13 q">
              {EXPERIMENT_METRICS[x.metric]} · from {fmtDayMonth(x.from)}
              {x.to ? ` to ${fmtDayMonth(x.to)}` : ''}
            </div>
            {r ? (
              <div className="t15 lh">
                {EXPERIMENT_METRICS[x.metric].replace(/ \(.*\)$/, '')} {VERDICT[r.verdict]}: {fmt(r.before)} before, {fmt(r.during)} during.
              </div>
            ) : (
              <div className="t14 q lh">
                {w.during.length} of {MIN_EXPERIMENT_DAYS} days logged during, {w.before.length} before. Too early to say.
              </div>
            )}
            <div className="row" style={{ gap: 8, justifyContent: 'flex-start' }}>
              {running && (
                <button type="button" className="chip sm" onClick={() => void save((settings.experiments ?? []).map((e) => (e.id === x.id ? { ...e, to: addDays(today, -1) } : e)))}>
                  End it
                </button>
              )}
              <button type="button" className="chip sm" onClick={() => void save((settings.experiments ?? []).filter((e) => e.id !== x.id))}>
                Remove
              </button>
            </div>
          </div>
        );
      })}

      <div className="card">
        <div className="lbl">A new experiment</div>
        <input className="field" value={question} placeholder="Does eating protein earlier help my sleep?" aria-label="The question" onChange={(e) => setQuestion(e.target.value)} spellCheck autoCapitalize="sentences" />
        <div className="row wrap" style={{ gap: 6, justifyContent: 'flex-start' }} role="radiogroup" aria-label="What to watch">
          {(Object.keys(EXPERIMENT_METRICS) as ExperimentMetric[]).map((m) => (
            <button key={m} type="button" role="radio" aria-checked={metric === m} className={`chip sm${metric === m ? ' on' : ''}`} onClick={() => setMetric(m)}>
              {EXPERIMENT_METRICS[m]}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn"
          disabled={!question.trim()}
          onClick={() => {
            void save([...(settings.experiments ?? []), { id: `x${Date.now()}`, question: question.trim(), metric, from: today }]);
            setQuestion('');
          }}
        >
          Start today
        </button>
      </div>
    </div>
  );
}
