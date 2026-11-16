// Runs and slides (finding 5, O42): a line in the parcel and a card on Story when three or more results go the same
// way in a row, with the reason in plain words.
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { currentRun, type Run, type RunMatch } from '../../football/runs';
import { OWN } from '../../football/store/season';
import type { StoredMatch } from '../../football/store/tables';
import { Panel } from '../../ui/kit/Kit';

const day = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const mine = (ms: StoredMatch[]) => ms.filter((m) => m.home === OWN || m.away === OWN).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)) as unknown as RunMatch[];

export const runOf = (ms: StoredMatch[]): Run | undefined => currentRun(mine(ms));

/** The run as it stands after a given night, for the parcel's result tile. */
export function RunLine({ upTo }: { upTo: string }) {
  const run = useLiveQuery(async () => runOf(await db.fbMatches.where('date').belowOrEqual(upTo).toArray()), [upTo]);
  if (!run || run.to !== upTo) return null;
  return <p className="md-q" style={{ margin: 0 }}><b>{run.line}</b> {run.reason}</p>;
}

/** Story's card for the run Brabo is on. */
export function RunCard({ run }: { run: Run }) {
  return (
    <Panel ink={run.kind === 'W' ? '#f2c46d' : '#93c3dc'} label={run.line}>
      <b className="k-lb">{run.line}</b>
      <span className="k-q">{day(run.from)} to {day(run.to)}.</span>
      <span>{run.reason}</span>
    </Panel>
  );
}
