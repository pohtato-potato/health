import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { dayKey, parseDay, type DayKey } from '../domain/dates';
import { fmtDayMonth } from '../domain/format';
import { boardTag, flightNo, statusOf, upcomingMilestones, type BoardStatus, type Milestone } from '../domain/milestones';
import type { Settings } from '../domain/types';
import { bump } from '../db/actions';
import { db } from '../db/db';
import { useAllDays, useMeasurements, useSessions, useSettings, useToday, useNow } from '../db/hooks';
import { back, go } from '../router';
import { Icon } from '../ui/Icon';
import { Sheet } from '../ui/Sheet';
import { RouteSwitch } from '../walk/RouteSwitch';
import { stepStreakFor, weeksFor } from '../state/derived';
import { nextCheckInDate } from './Photos';
import { milestoneGroup, type DepartureGroup } from '../domain/milestones';

export interface BoardRow {
  m: Milestone;
  status: BoardStatus;
  scheduled?: DayKey;
}

/** The milestones ahead, with each one's first ETA kept so a slip shows as Delayed. */
export function useBoard(): BoardRow[] | undefined {
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  const measurements = useMeasurements();
  const sessions = useSessions();
  const checkins = useLiveQuery(() => db.checkins.toArray(), []);
  const etas = useLiveQuery(async () => new Map((await db.seen.where('id').startsWith('eta:').toArray()).map((s) => [s.id.slice(4), dayKey(new Date(s.at))])), []);
  const ms = settings && days && measurements && sessions && checkins ? milestonesFor(settings, today, days, measurements, sessions, checkins) : undefined;

  useEffect(() => {
    if (!ms || !etas) return;
    for (const m of ms) {
      if (!etas.has(m.id)) void db.seen.put({ id: `eta:${m.id}`, at: parseDay(m.eta).getTime() });
      else if (statusOf(m, etas.get(m.id), today) === 'Delayed') {
        void db.seen.get(`delayed:${m.id}`).then((seen) => {
          if (seen) return;
          void db.seen.put({ id: `delayed:${m.id}`, at: Date.now() });
          void bump('delayed', { value: m.id });
        });
      }
    }
  }, [ms?.map((m) => `${m.id}@${m.eta}`).join(','), etas, today]);

  if (!ms || !etas) return undefined;
  return ms.map((m) => ({ m, scheduled: etas.get(m.id), status: statusOf(m, etas.get(m.id), today) }));
}

function milestonesFor(settings: Settings, today: DayKey, days: Parameters<typeof upcomingMilestones>[0]['days'], measurements: Parameters<typeof upcomingMilestones>[0]['measurements'], sessions: Parameters<typeof weeksFor>[1], checkins: Parameters<typeof nextCheckInDate>[0]) {
  return upcomingMilestones({
    today,
    days,
    measurements,
    streak: stepStreakFor(settings, days, today),
    weeks: weeksFor(settings, sessions, today),
    goalDate: settings.goalDate,
    nextCheckIn: nextCheckInDate(checkins),
  });
}

const STATUS_COLOR: Record<BoardStatus, string> = {
  'On time': '#8fc9b0',
  Boarding: '#f5c451',
  Delayed: '#ef8a74',
  Early: '#8fb4ff',
};

function Board({ rows, onRow, limit }: { rows: BoardRow[]; onRow: (r: BoardRow) => void; limit?: number }) {
  const shown = limit ? rows.slice(0, limit) : rows;
  const now = useNow(30_000);
  const t = new Date(now);
  return (
    <div className="board" role="table" aria-label="Departures">
      <div className="board-top">
        <span>DEPARTURES</span>
        <span className="tn">
          {String(t.getHours()).padStart(2, '0')}:{String(t.getMinutes()).padStart(2, '0')}
        </span>
      </div>
      <div className="board-row head" role="row">
        <span role="columnheader">DUE</span>
        <span role="columnheader">DESTINATION</span>
        <span role="columnheader">STATUS</span>
      </div>
      {shown.map((r) => (
        <button key={r.m.id} type="button" className="board-row" role="row" onClick={() => onRow(r)}>
          <span>{fmtDayMonth(r.m.eta).toUpperCase()}</span>
          <span className="dest-col">
            <span className="dest">{r.m.dest}</span>
            <span className="tag">
              {boardTag(r.m)}
              {r.status === 'Delayed' && r.scheduled && r.scheduled !== r.m.eta ? ` · was ${fmtDayMonth(r.scheduled)}` : ''}
            </span>
          </span>
          <span className={r.status === 'Boarding' ? 'blink' : undefined} style={{ color: STATUS_COLOR[r.status] }}>
            {r.status.toUpperCase()}
          </span>
        </button>
      ))}
      {!shown.length && <div className="board-row empty">NO DEPARTURES YET · LOG A FEW DAYS</div>}
    </div>
  );
}

/** On the Journey hub: the next few departures. */
export function DeparturesCard() {
  const rows = useBoard();
  const [pass, setPass] = useState<BoardRow | null>(null);
  if (!rows) return null;
  return (
    <div className="card" style={{ gap: 10 }}>
      <div className="row base">
        <div className="lbl gold">Departures</div>
        <button type="button" className="link t13" onClick={() => go('/departures')}>
          All {rows.length}
        </button>
      </div>
      <Board rows={rows} onRow={setPass} limit={4} />
      {pass && <BoardingPass row={pass} onClose={() => setPass(null)} />}
    </div>
  );
}

export function DeparturesPage() {
  const rows = useBoard();
  const arrivals = useLiveQuery(async () => (await db.seen.toArray()).filter((s) => /^(city:|km:|chapter:|waist:\d|streak:)/.test(s.id)).sort((a, b) => b.at - a.at), []);
  const [pass, setPass] = useState<BoardRow | null>(null);
  const [group, setGroup] = useState<DepartureGroup | 'all'>('all');
  if (!rows || !arrivals) return <div className="page bare" />;
  const shown = group === 'all' ? rows : rows.filter((r) => milestoneGroup(r.m.kind) === group);
  return (
    <div className="page bare">
      <button type="button" className="backlink" onClick={() => back('/walk')}>
        <Icon name="left" size={20} stroke={1.8} />
        Walk
      </button>
      <RouteSwitch on="departures" />
      <div className="col gap6">
        <h1 className="h1">Departures</h1>
        <div className="t15 q lh">Every milestone ahead, with an arrival time from your current pace. Tap one for its boarding pass.</div>
      </div>
      <div className="row" style={{ gap: 8, overflowX: 'auto', justifyContent: 'flex-start' }} role="radiogroup" aria-label="Show departures for">
        {(
          [
            ['all', 'All'],
            ['walk', 'Walk'],
            ['steps', 'Steps'],
            ['training', 'Training'],
            ['shape', 'Shape'],
          ] as [DepartureGroup | 'all', string][]
        ).map(([id, label]) => (
          <button key={id} type="button" role="radio" aria-checked={group === id} className={`chip sm${group === id ? ' on' : ''}`} onClick={() => setGroup(id)}>
            {label}
          </button>
        ))}
      </div>
      <Board rows={shown} onRow={setPass} />
      <div className="t12 d lh">The first time a milestone appears, its time is fixed. If your pace slips, it shows as delayed; pick it up and it's back on time.</div>
      {arrivals.length > 0 && (
        <div className="card" style={{ gap: 0 }}>
          <div className="lbl" style={{ paddingBottom: 6 }}>
            Arrivals
          </div>
          {arrivals.slice(0, 30).map((a) => (
            <div key={a.id} className="sess" style={{ minHeight: 44 }}>
              <span className="t14">{arrivalName(a.id)}</span>
              <span className="t13 q">{fmtDayMonth(dayKey(new Date(a.at)))}</span>
            </div>
          ))}
        </div>
      )}
      {pass && <BoardingPass row={pass} onClose={() => setPass(null)} />}
    </div>
  );
}

function arrivalName(id: string): string {
  const [kind, a, b] = id.split(':');
  if (kind === 'city') return a;
  if (kind === 'km') return `${Number(a).toLocaleString('en-IN')} km walked`;
  if (kind === 'chapter') return `Chapter ${a} of the walk`;
  if (kind === 'waist') return a === 'half-height' ? 'Waist under half your height' : `Waist ${a} in`;
  if (kind === 'streak') return a === 'steps' ? `${b}-day step streak` : `${b} training weeks`;
  return id;
}

export function BoardingPass({ row, onClose }: { row: BoardRow; onClose: () => void }) {
  const settings = useSettings();
  const { m, status } = row;
  return (
    <Sheet title="Boarding pass" onClose={onClose}>
      <div className="pass">
        <div className="row base">
          <span className="pass-k">Health Airways</span>
          <span className="pass-k">Boarding pass</span>
        </div>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div className="col gap2" style={{ minWidth: 0 }}>
            <span className="pass-k">From</span>
            <span className="pass-city">{m.from}</span>
          </div>
          <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0, margin: '0 6px 6px' }}>
            <path d="M2 13.5l8-1.5 5-8h2l-2 8 5 .5 1.5-2.5H23l-1 4 1 4h-1.5L20 15.5l-5 .5 2 8h-2l-5-8-8-1.5z" fill="currentColor" transform="scale(.9) translate(1 -1)" />
          </svg>
          <div className="col gap2" style={{ alignItems: 'flex-end', minWidth: 0, textAlign: 'right' }}>
            <span className="pass-k">To</span>
            <span className="pass-city">{m.dest}</span>
          </div>
        </div>
        <div className="pass-grid">
          <span>
            <i>Passenger</i>
            {settings?.name || 'You'}
          </span>
          <span>
            <i>Flight</i>
            {flightNo(m.id)}
          </span>
          <span>
            <i>Arrives</i>
            {fmtDayMonth(m.eta)}
          </span>
          <span>
            <i>Status</i>
            {status}
          </span>
        </div>
        <div className="pass-tear" />
        <div className="t13 lh" style={{ color: 'var(--paper-ink)' }}>
          {m.detail}.{row.scheduled && row.scheduled !== m.eta && !m.fixed ? ` First scheduled for ${fmtDayMonth(row.scheduled)}.` : ''}
        </div>
        <div className="pass-code" aria-hidden="true">
          {Array.from({ length: 56 }, (_, i) => (
            <i key={i} style={{ width: ((i * 7 + m.id.length * 3) % 3) + 1 }} />
          ))}
        </div>
      </div>
    </Sheet>
  );
}
