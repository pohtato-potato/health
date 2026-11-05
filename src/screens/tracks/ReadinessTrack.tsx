import { fitnessFreshness, headlineFor } from '../../domain/trackRules';
import { readinessHits } from '../../domain/trackStats';
import { go } from '../../router';
import { forecastData } from '../../state/forecastData';
import { DrawnLine } from '../../ui/you/DrawnLine';
import { HUE } from '../../ui/you/palette';
import { headInput, type TrackData } from './data';
import { TrackShell } from './Template';
import { TRACK_LOOK } from './look';

const ACCENT = TRACK_LOOK.readiness.accent;

export function ReadinessTrack({ data }: { data: TrackData }) {
  const { settings, today } = data;
  const all = [...data.days.values()];
  const r = forecastData(settings, today, all, data.entries, data.sessions, data.sets).readiness;
  const hits = readinessHits(data.sessions.filter((s) => s.status === 'done'));
  const ff = fitnessFreshness(data.sessions, today);
  return (
    <TrackShell
      track="readiness"
      head={headlineFor('readiness', { ...headInput(data), readiness: r })}
      views={[
        { label: 'What fed it', el: (
          <div className="yu-rows">
            {r.parts.length === 0 && <div><span>Log last night's sleep and the reasons show here.</span></div>}
            {r.parts.map((p) => <div key={p.key}><span>{p.label}</span><b className="tn">{p.delta > 0 ? `+${p.delta}` : p.delta < 0 ? `−${Math.abs(p.delta)}` : 'No change'}</b></div>)}
          </div>
        ) },
        { label: 'Against sessions', el: <div className="yu-rows"><div><span>Readiness and the session agreed</span><b>{hits.total ? `${hits.agreed} of ${hits.total} times` : 'Not enough sessions yet'}</b></div></div> },
        { label: 'Fitness', el: ff.fitness.length > 1 ? (
          <section className="yu-sec">
            <div className="yu-over"><DrawnLine vals={ff.fitness} c={HUE.train} h={90} area={false} last={false} /><DrawnLine vals={ff.freshness} c={ACCENT} h={90} area={false} last={false} /></div>
            <div className="yu-key"><span style={{ '--k': HUE.train } as React.CSSProperties}>Fitness</span><span style={{ '--k': ACCENT } as React.CSSProperties}>Freshness</span></div>
            <span className="yu-q">Fitness builds over weeks of sessions. Freshness drops after work and comes back with rest. Each has its own scale.</span>
          </section>
        ) : <div className="yu-card"><span className="yu-q">Not enough sessions yet.</span></div> },
      ]}
    >
      <button type="button" className="btn ghost" onClick={() => go('/readiness')}>Today's full reading</button>
    </TrackShell>
  );
}
