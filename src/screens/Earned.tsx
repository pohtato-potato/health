import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { ACHIEVEMENTS } from '../domain/achievements';
import { firsts, milestones, odometers, shelves, type Dated } from '../domain/earned';
import { fmtDayMonth } from '../domain/format';
import { titleStats } from '../domain/titles';
import { trophyCandidates } from '../domain/trophies';
import { db } from '../db/db';
import { useAllSets, useSightings, useToday } from '../db/hooks';
import { back, go } from '../router';
import { Icon } from '../ui/Icon';
import { RegionFrameView } from '../ui/live/RegionFrame';
import { useLevel } from './Character';
import { Rewards } from './earned/Rewards';
import { Shelves } from './earned/Shelves';
import { TitlesWall } from './earned/TitlesWall';
import { TrophyShelf } from './earned/TrophyShelf';

function DatedList({ title, rows }: { title: string; rows: Dated[] }) {
  if (!rows.length) return null;
  return (
    <section className="yu-sec">
      <h2>{title}</h2>
      <div>{rows.map((r) => <div key={r.id} className="yu-dated"><span>{fmtDayMonth(r.date)}</span><span>{r.text}</span></div>)}</div>
    </section>
  );
}

export function Earned() {
  const lv = useLevel();
  const today = useToday();
  const sets = useAllSets();
  const sightings = useSightings();
  const forecasts = useLiveQuery(() => db.forecasts.toArray(), []);
  const usage = useLiveQuery(() => db.usage.where('kind').equals('open').toArray(), []);
  const edits = useLiveQuery(() => db.edits.count(), []);
  const moments = useLiveQuery(() => db.moments.toArray(), []);
  const achieved = useLiveQuery(() => db.achievements.toArray(), []);

  const ready = lv && sets && sightings && forecasts && usage && edits !== undefined && moments && achieved;
  const stats = useMemo(() => (ready ? titleStats({
    today, settings: lv.settings, days: lv.days, entries: lv.entries, sessions: lv.sessions, sets, sightings, forecasts, usage, edits,
  }) : undefined), [ready, today, lv?.settings, lv?.days, lv?.entries, lv?.sessions, sets, sightings, forecasts, usage, edits]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready || !stats) return <div className="page" />;
  const { settings, days, entries, sessions, unlocked, level } = lv;
  const named = new Map(ACHIEVEMENTS.map((a) => [a.id, a.name]));
  const shelfRows = shelves({
    moments,
    achievements: achieved.flatMap((a) => (a.date ? [{ id: a.id, date: a.date, name: typeof named.get(a.id) === 'string' ? (named.get(a.id) as string) : undefined }] : [])),
    sets,
  });
  const odo = odometers({ days, sessions, sets });
  return (
    <RegionFrameView km={stats.km} className="yu-page">
      <div className="yu-stack">
        <button type="button" className="backlink" onClick={() => back('/you')}><Icon name="left" size={20} stroke={1.8} />You</button>
        <h1>Earned</h1>
        <TrophyShelf all={trophyCandidates({ today, settings, days, entries, sets, sightings })} picks={settings.trophyPicks} />
        <TitlesWall settings={settings} stats={stats} unlocked={unlocked} level={level} />
        <section className="yu-sec"><h2>Themes and rewards</h2><Rewards settings={settings} unlocked={unlocked} today={today} /></section>
        <Shelves shelves={shelfRows} />
        <DatedList title="Firsts" rows={firsts({ days, sessions, sets, sightings })} />
        <DatedList title="Milestones" rows={milestones({ days, sessions })} />
        {odo.length > 0 && (
          <section className="yu-sec">
            <h2>Lifetime</h2>
            <div className="yu-odo">{odo.map((o) => <div key={o.id}><b>{o.value}</b><span>{o.label}</span></div>)}</div>
          </section>
        )}
        <div className="yu-doors">
          <button type="button" onClick={() => go('/records')}><b>Records wall</b><span>Every best</span></button>
          <button type="button" onClick={() => go('/achievements')}><b>Achievements</b><span>Sets and progress</span></button>
        </div>
      </div>
    </RegionFrameView>
  );
}
