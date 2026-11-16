import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type CSSProperties } from 'react';
import { db } from '../db/db';
import { useAllDays, useAllEntries, useAllSets, useSessions, useSettings, useToday } from '../db/hooks';
import type { AskInput } from '../domain/askData';
import { addDays } from '../domain/dates';
import { insightCards, statOfWeek, trackRecord, trendWorking, type InsightCard } from '../domain/insightCards';
import { trendRows, type TrendRow } from '../domain/momentum';
import { back, go } from '../router';
import { Door, Doors, Hero, PageHead, Panel, Sect, type HowThisWorks } from '../ui/kit/Kit';
import { Heatmap } from './Heatmap';
import { Ask } from './insights/Ask';

const AREA: Record<TrendRow['area'], string> = { steps: 'Steps', protein: 'Protein', sleep: 'Sleep', training: 'Training' };
const HEATMAP_DAYS = 62;

const AREA_INK: Record<TrendRow['area'], string> = { steps: '#8fdcb6', protein: '#c2b2ff', sleep: '#93c3dc', training: '#ff9a76' };

/** A trend as a tile (board three): its name and number in its ink, its word, and "why?" opening the working. */
function TrendTile({ row }: { row: TrendRow }) {
  const [open, setOpen] = useState(false);
  const ink = AREA_INK[row.area];
  const m = /^([\d,.]+(?: h \d+| g)?)\s*(.*)$/.exec(row.now);
  const num = m ? m[1] : row.now;
  const words = m ? m[2].replace(/^sessions /, '').replace(/^a (day|night)$/, '') : '';
  return (
    <button type="button" className="k-panel k-trend-tile" style={{ '--ink': ink } as CSSProperties} aria-expanded={open} onClick={() => setOpen(!open)}>
      <span className="k-lb">{AREA[row.area]}</span>
      <b className="k-num ink">{num}</b>
      <span className="k-q">{open ? trendWorking(row) : `${row.word}${words ? ` · ${words}` : ''} · why?`}</span>
    </button>
  );
}

function Card({ card }: { card: InsightCard }) {
  return (
    <Panel ink={card.text ? '#93c3dc' : '#ede6da'}>
      <span className="k-lb">{card.title}</span>
      {card.text ? (
        <>
          <span>{card.text}</span>
          <span className="k-q">{card.working} {card.confidence}.</span>
        </>
      ) : <span className="k-q">{card.needed}</span>}
    </Panel>
  );
}

const HOW: HowThisWorks = {
  title: 'Insights',
  steps: [
    { icon: 'search', ink: '#ede6da', head: 'Ask your data', line: 'Plain questions; every answer shows the days it came from.' },
    { icon: 'trend', ink: '#8fdcb6', head: 'Every trend', line: 'Two weeks now against the two weeks a month ago. Tap one for why.' },
    { icon: 'scope', ink: '#93c3dc', head: 'What the days suggest', line: 'Each finding says how sure it is, or what it still needs.' },
    { icon: 'check', ink: '#f2c46d', head: 'Track record', line: 'The app keeps score of its own forecasts.' },
  ],
};

/** Insights (board three): ask, the stat of the week, every trend as tiles; then what the days suggest, every day and the record book. */
export function Insights() {
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  const sessions = useSessions();
  const sets = useAllSets();
  const entries = useAllEntries();
  const forecasts = useLiveQuery(() => db.forecasts.toArray(), []);
  if (!settings || !days || !sessions || !sets || !entries || !forecasts) return <div className="page bare k-page k-light you" />;
  const input: AskInput = { today, settings, days, entries, sessions, sets };
  const trends = trendRows(today, input);
  const stat = statOfWeek(input);
  const record = trackRecord(forecasts);
  const from = addDays(today, -HEATMAP_DAYS);
  const [lead, ...rest] = stat ? stat.small.split(', ') : [];
  return (
    <div className="page bare k-page k-light you">
      <PageHead back="You" onBack={() => back('/you')} title="Insights" help={HOW} family="back" />
      <Ask input={input} />
      {stat && (
        <Panel ink="#8fdcb6">
          <span className="k-q">Stat of the week</span>
          <Hero value={stat.big} ink="#8fdcb6" label={lead.replace(/\.$/, '')} />
          {rest.length > 0 && <span className="k-q">{rest.join(', ')}</span>}
        </Panel>
      )}
      <Sect>Every trend</Sect>
      {trends.length ? <div className="k-doors two">{trends.map((r) => <TrendTile key={r.area} row={r} />)}</div>
        : <Panel><span className="k-q">Trends start after four logged days in a fortnight.</span></Panel>}
      <Sect>What the days suggest</Sect>
      {insightCards(input).map((c) => <Card key={c.id} card={c} />)}
      <Sect>Every day</Sect>
      <div className="k-heat">
        <Heatmap settings={settings} today={today} days={days} entries={entries.filter((e) => e.date >= from)} sessions={sessions} sets={sets} />
      </div>
      <Doors two label="More">
        <Door line icon="ground" name="Record book" value="Every best" family="earned" onClick={() => go('/records')} />
        <Panel ink="#f2c46d">
          <span className="k-lb">Track record</span>
          <span className="k-q">{record ? `The app's forecasts landed in range ${record.hit} of ${record.total} times.` : 'No forecasts have come due yet.'}</span>
        </Panel>
      </Doors>
    </div>
  );
}
