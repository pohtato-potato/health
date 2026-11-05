import { useState, type CSSProperties } from 'react';
import { eventDates, naturalEvents } from '../../domain/insightCards';
import { COMPARE_KEYS, compareSeries, headlineFor, moveTogether, type CompareKey } from '../../domain/trackRules';
import { DrawnLine } from '../../ui/you/DrawnLine';
import { HUE } from '../../ui/you/palette';
import { TrackShell } from './Template';
import { headInput, type TrackData } from './data';

const INK: Record<CompareKey, string> = { steps: HUE.steps, sleep: HUE.sleep, protein: HUE.food, kcal: '#ffc27a', weight: HUE.shape };
const keys = Object.keys(COMPARE_KEYS) as CompareKey[];
const WORD = { together: 'They rise and fall together.', opposite: 'When one rises, the other tends to fall.', apart: 'No clear link between them yet.' };

function Pick({ label, on, not, set }: { label: string; on: CompareKey; not: CompareKey; set: (k: CompareKey) => void }) {
  return (
    <div className="yu-views" role="group" aria-label={label}>
      {keys.filter((k) => k !== not).map((k) => <button key={k} type="button" aria-pressed={k === on} className={k === on ? 'on' : undefined} onClick={() => set(k)}>{COMPARE_KEYS[k]}</button>)}
    </div>
  );
}

/** Any two measures, over the days that have both. */
export function CompareTrack({ data }: { data: TrackData }) {
  const [a, setA] = useState<CompareKey>('steps');
  const [b, setB] = useState<CompareKey>('sleep');
  const s = compareSeries(a, b, { today: data.today, days: [...data.days.values()], entries: data.entries });
  const link = moveTogether(s.a, s.b);
  const events = naturalEvents([...data.days.values()], data.settings, data.today).slice(0, 6);
  return (
    <TrackShell track="compare" head={headlineFor('compare', headInput(data))}>
      <Pick label="First measure" on={a} not={b} set={setA} />
      <Pick label="Second measure" on={b} not={a} set={setB} />
      {s.days.length > 1 ? (
        <section className="yu-sec">
          <div className="yu-over" key={`${a}${b}`}><DrawnLine vals={s.a} c={INK[a]} h={110} area={false} last={false} /><DrawnLine vals={s.b} c={INK[b]} h={110} area={false} last={false} /></div>
          <div className="yu-key"><span style={{ '--k': INK[a] } as CSSProperties}>{COMPARE_KEYS[a]}</span><span style={{ '--k': INK[b] } as CSSProperties}>{COMPARE_KEYS[b]}</span></div>
          <div className="yu-card"><b>{link ? WORD[link] : 'Too few days to say yet'}</b><span className="yu-q">From {s.days.length} days with both, in the last 60. Each line has its own scale. This shows a pattern, not a cause.</span></div>
        </section>
      ) : <div className="yu-card"><span className="yu-q">No days yet with both of these logged.</span></div>}
      {events.length > 0 && (
        <section className="yu-sec">
          <h2>When life changed things</h2>
          {events.map((e) => <div key={e.from} className="yu-card"><b>{e.name}, {eventDates(e)}</b><span className="yu-q">{e.line ?? e.needed}</span></div>)}
        </section>
      )}
    </TrackShell>
  );
}
