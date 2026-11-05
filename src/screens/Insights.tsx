import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../db/db';
import { useAllDays, useAllEntries, useAllSets, useSessions, useSettings, useToday } from '../db/hooks';
import type { AskInput } from '../domain/askData';
import { addDays } from '../domain/dates';
import { insightCards, statOfWeek, trackRecord, trendWorking, type InsightCard } from '../domain/insightCards';
import { trendRows, type TrendRow } from '../domain/momentum';
import { back, go } from '../router';
import { Icon } from '../ui/Icon';
import { useHold } from '../ui/you/useHold';
import { Heatmap } from './Heatmap';
import { Ask } from './insights/Ask';

const AREA: Record<TrendRow['area'], string> = { steps: 'Steps', protein: 'Protein', sleep: 'Sleep', training: 'Training' };
const HEATMAP_DAYS = 62;

function TrendLine({ row }: { row: TrendRow }) {
  const [open, setOpen] = useState(false);
  const hold = useHold(open, setOpen);
  return (
    <button type="button" className="yu-why-row" aria-expanded={open} {...hold}>
      <span><b>{AREA[row.area]}</b><span>{row.word}</span></span>
      <span className="yu-q">{open ? trendWorking(row) : 'Why did this change?'}</span>
    </button>
  );
}

function Card({ card }: { card: InsightCard }) {
  return (
    <div className="yu-card">
      <b>{card.title}</b>
      {card.text ? (
        <>
          <span>{card.text}</span>
          <span className="yu-q">{card.working} {card.confidence}.</span>
        </>
      ) : <span className="yu-q">{card.needed}</span>}
    </div>
  );
}

/** What your numbers say, how sure they are, and how they got there. */
export function Insights() {
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  const sessions = useSessions();
  const sets = useAllSets();
  const entries = useAllEntries();
  const forecasts = useLiveQuery(() => db.forecasts.toArray(), []);
  if (!settings || !days || !sessions || !sets || !entries || !forecasts) return <div className="page" />;
  const input: AskInput = { today, settings, days, entries, sessions, sets };
  const trends = trendRows(today, input);
  const stat = statOfWeek(input);
  const record = trackRecord(forecasts);
  const from = addDays(today, -HEATMAP_DAYS);
  return (
    <div className="page bare yu-page yu-stack">
      <button type="button" className="backlink" onClick={() => back('/you')}><Icon name="left" size={20} stroke={1.8} />You</button>
      <h1>Insights</h1>
      <Ask input={input} />
      {stat && <section className="yu-card"><b>Stat of the week</b><span><span className="yu-big">{stat.big}</span> {stat.small}</span></section>}
      <section className="yu-sec">
        <h2>Every trend</h2>
        {trends.length ? <div className="yu-card">{trends.map((r) => <TrendLine key={r.area} row={r} />)}</div>
          : <div className="yu-card"><span className="yu-q">Trends start after four logged days in a fortnight.</span></div>}
      </section>
      <section className="yu-sec">
        <h2>What the days suggest</h2>
        {insightCards(input).map((c) => <Card key={c.id} card={c} />)}
      </section>
      <section className="yu-sec">
        <h2>Every day</h2>
        <Heatmap settings={settings} today={today} days={days} entries={entries.filter((e) => e.date >= from)} sessions={sessions} sets={sets} />
      </section>
      <section className="yu-sec">
        <h2>Record book</h2>
        <button type="button" className="btn ghost" onClick={() => go('/records')}>Open the record book</button>
      </section>
      <section className="yu-card">
        <b>Track record</b>
        <span className="yu-q">{record ? `The app's forecasts landed in range ${record.hit} of ${record.total} times.` : 'No forecasts have come due yet.'}</span>
      </section>
    </div>
  );
}
