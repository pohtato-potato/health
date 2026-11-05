import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type CSSProperties } from 'react';
import { patchSettings } from '../../db/actions';
import { db } from '../../db/db';
import { addDays, type DayKey } from '../../domain/dates';
import { headlineFor, ownSummary } from '../../domain/trackRules';
import type { CustomTrack } from '../../domain/types';
import { DrawnLine } from '../../ui/you/DrawnLine';
import { TrackShell } from './Template';
import { headInput, type TrackData } from './data';

const KINDS: [CustomTrack['kind'], string][] = [['count', 'A number'], ['scale', '1 to 5'], ['yesno', 'Yes or no']];
const LINE_DAYS = 30;

function Log({ t, value, date }: { t: CustomTrack; value: number | undefined; date: DayKey }) {
  const put = (n: number) => db.trackValues.put({ id: `${t.id}:${date}`, trackId: t.id, date, value: n, at: Date.now() });
  if (t.kind === 'count') {
    return (
      <label className="yu-q yu-inline">Today{t.unit ? ` (${t.unit})` : ''}
        <input type="number" inputMode="decimal" key={value ?? 'blank'} defaultValue={value} className="yu-num" aria-label={`${t.name} today`} onBlur={(e) => { if (e.target.value !== '') void put(Number(e.target.value)); }} />
      </label>
    );
  }
  const options: [number, string][] = t.kind === 'yesno' ? [[1, 'Yes'], [0, 'No']] : [1, 2, 3, 4, 5].map((n) => [n, String(n)]);
  return <div className="yu-seg" role="group" aria-label={`${t.name} today`}>{options.map(([n, l]) => <button key={n} type="button" aria-pressed={value === n} onClick={() => void put(n)}>{l}</button>)}</div>;
}

/** Anything else worth counting: a number, 1 to 5, or yes and no. */
export function OwnTrack({ data }: { data: TrackData }) {
  const { settings, today } = data;
  const values = useLiveQuery(() => db.trackValues.toArray(), []);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<CustomTrack['kind']>('count');
  const [unit, setUnit] = useState('');
  const tracks = (settings.customTracks ?? []).filter((t) => t.active);
  const add = async () => {
    const clean = name.trim();
    if (!clean) return;
    const now = Date.now();
    await patchSettings((s) => ({ customTracks: [...(s.customTracks ?? []), { id: `t${now}`, name: clean, kind, unit: kind === 'count' && unit.trim() ? unit.trim() : undefined, active: true, createdAt: now }] }));
    setName(''); setUnit('');
  };
  const from = addDays(today, -(LINE_DAYS - 1));
  return (
    <TrackShell track="own" head={headlineFor('own', { ...headInput(data), ownCount: tracks.length })}>
      {tracks.map((t) => {
        const mine = (values ?? []).filter((v) => v.trackId === t.id).sort((a, b) => a.date.localeCompare(b.date));
        const series = mine.filter((v) => v.date >= from).map((v) => v.value);
        return (
          <div key={t.id} className="yu-card">
            <b>{t.name}</b>
            <span className="yu-q">{ownSummary(t, mine, today)}</span>
            {t.kind !== 'yesno' && series.length > 1 && <DrawnLine vals={series} c="var(--c)" c2="#ff7db8" h={56} area={false} />}
            <Log t={t} value={mine.find((v) => v.date === today)?.value} date={today} />
            <button type="button" className="link yu-left" onClick={() => void patchSettings((s) => ({ customTracks: (s.customTracks ?? []).map((x) => (x.id === t.id ? { ...x, active: false } : x)) }))}>Stop tracking</button>
          </div>
        );
      })}
      <section className="yu-sec"><h2>Add a track</h2>
        <div className="yu-card yu-form">
          <label>Name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <div className="yu-seg" role="group" aria-label="Kind">{KINDS.map(([k, l]) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>{l}</button>)}</div>
          {kind === 'count' && <label>Unit, if any<input value={unit} onChange={(e) => setUnit(e.target.value)} /></label>}
          <button type="button" className="btn sm" disabled={!name.trim()} onClick={add} style={{ '--x': 0 } as CSSProperties}>Add it</button>
        </div>
      </section>
    </TrackShell>
  );
}
