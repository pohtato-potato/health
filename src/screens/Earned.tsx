import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState, type CSSProperties } from 'react';
import { ACHIEVEMENTS, ACTIVE_ACHIEVEMENTS } from '../domain/achievements';
import { firsts, milestones, odometers, shelves, type Dated } from '../domain/earned';
import { fmtDayMonth, fmtInt } from '../domain/format';
import { availableThemes } from '../domain/themes';
import { TITLE_DEFS, titleStats, wornTitle } from '../domain/titles';
import { TITLES } from '../domain/rewards';
import { pickedTrophies, trophyCandidates } from '../domain/trophies';
import { db } from '../db/db';
import { useAllSets, useSightings, useToday } from '../db/hooks';
import { back, go, useRoute } from '../router';
import { Door, Doors, Hero, PageHead, Sect, type HowThisWorks } from '../ui/kit/Kit';
import { ThemeSheet } from '../ui/Theme';
import { useLevel } from './Character';
import { Rewards } from './earned/Rewards';
import { Shelves } from './earned/Shelves';
import { NewTitle, TitlesWall } from './earned/TitlesWall';
import { TrophyShelf } from './earned/TrophyShelf';

const GOLD = '#f2c46d';

const HOW: HowThisWorks = {
  title: 'Earned',
  steps: [
    { icon: 'pack', ink: GOLD, head: 'Earned from your days', line: 'Achievements, titles and records come from what you log. Nothing is bought.' },
    { icon: 'name', ink: '#ff9a76', head: 'Wear one title', line: 'A new title is offered once. Wear it, or pick any earned one later.' },
    { icon: 'kit', ink: '#c2b2ff', head: 'Themes to wear', line: 'Some themes are free; others open with an achievement.' },
    { icon: 'scope', ink: '#8fdcb6', head: 'Secrets', line: 'Hidden achievements. A hint opens as you earn more.' },
  ],
};

function DatedList({ title, rows }: { title: string; rows: Dated[] }) {
  if (!rows.length) return null;
  return (
    <>
      <Sect>{title}</Sect>
      <div className="k-panel k-rows">{rows.map((r) => <div key={r.id} className="k-rowl"><span>{r.text}</span><b>{fmtDayMonth(r.date)}</b></div>)}</div>
    </>
  );
}

/** Earned (board three): what you have earned leads, the three trophies, a new title to wear, then the cabinet. */
export function Earned() {
  const lv = useLevel();
  const today = useToday();
  const { params } = useRoute();
  const sub = params.get('v');
  const [themes, setThemes] = useState(false);
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

  if (!ready || !stats) return <div className="page bare k-page k-light you" />;
  const { settings, days, entries, sessions, unlocked, level } = lv;
  const toEarned = () => back('/earned');

  if (sub === 'titles') {
    return (
      <div className="page bare k-page k-light you">
        <PageHead back="Earned" onBack={toEarned} title="Titles" family="earned" />
        <TitlesWall settings={settings} stats={stats} unlocked={unlocked} level={level} />
      </div>
    );
  }
  if (sub === 'rewards') {
    return (
      <div className="page bare k-page k-light you">
        <PageHead back="Earned" onBack={toEarned} title="Rewards" family="earned" />
        <Rewards settings={settings} unlocked={unlocked} today={today} />
      </div>
    );
  }
  if (sub === 'story') {
    const named = new Map(ACHIEVEMENTS.map((a) => [a.id, a.name]));
    const shelfRows = shelves({
      moments,
      achievements: achieved.flatMap((a) => (a.date ? [{ id: a.id, date: a.date, name: typeof named.get(a.id) === 'string' ? (named.get(a.id) as string) : undefined }] : [])),
      sets,
    });
    const odo = odometers({ days, sessions, sets });
    return (
      <div className="page bare k-page k-light you">
        <PageHead back="Earned" onBack={toEarned} title="So far" family="earned" />
        {odo.length > 0 && (
          <div className={`k-tiles${odo.length === 4 ? ' two' : ''}`}>
            {odo.map((o, i) => <div key={o.id} className="k-panel" style={{ '--ink': ['#8fdcb6', '#ff9a76', '#f2c46d', '#93c3dc'][i % 4] } as CSSProperties}><b className="k-num ink">{o.value}</b><span className="k-q">{o.label}</span></div>)}
          </div>
        )}
        <Shelves shelves={shelfRows} />
        <DatedList title="Firsts" rows={firsts({ days, sessions, sets, sightings })} />
        <DatedList title="Milestones" rows={milestones({ days, sessions })} />
      </div>
    );
  }

  const worn = wornTitle(settings, unlocked, level);
  const titlesHad = TITLE_DEFS.filter((t) => t.rule(stats)).length + TITLES.filter((t) => t.unlocked(unlocked, level)).length;
  // O42 slip 30: counted as the Achievements page counts (retired secrets left out).
  const secretsFound = ACTIVE_ACHIEVEMENTS.filter((a) => a.cat === 'secret' && unlocked.has(a.id)).length;
  const wearable = availableThemes(unlocked).length;
  const trophies = trophyCandidates({ today, settings, days, entries, sets, sightings });
  return (
    <div className="page bare k-page k-light you">
      <PageHead back="You" onBack={() => back('/you')} title="Earned" help={HOW} family="earned" />
      <div className="k-row end">
        <Hero value={fmtInt(unlocked.size)} ink={GOLD} label="earned" />
        <span className="k-col k-r" style={{ flex: 'none', paddingBottom: 4 }}>
          <span className="k-q">Wearing</span>
          <b style={{ color: GOLD }}>{worn ?? 'Nothing yet'}</b>
        </span>
      </div>
      <TrophyShelf all={trophies} picks={settings.trophyPicks} shown={pickedTrophies(trophies, settings.trophyPicks, 6)} />
      <NewTitle settings={settings} stats={stats} />
      <Sect>The cabinet</Sect>
      <Doors two label="The cabinet">
        <Door line icon="pack" name="Titles" value={`${fmtInt(titlesHad)} earned`} family="earned" onClick={() => go('/earned', { v: 'titles' })} />
        <Door line icon="ground" name="Records" value="The book" family="earned" onClick={() => go('/records')} />
        <Door line icon="kit" name="Themes" value={`${fmtInt(wearable)} to wear`} family="earned" onClick={() => setThemes(true)} />
        <Door line icon="scope" name="Secrets" value={`${fmtInt(secretsFound)} found`} family="earned" onClick={() => go('/achievements', { f: 'secret' })} />
        <Door line icon="win" name="Achievements" value="Sets and progress" family="earned" onClick={() => go('/achievements')} />
        <Door line icon="calendar" name="So far" value="Shelves, firsts" family="earned" onClick={() => go('/earned', { v: 'story' })} />
        <Door line icon="bolt" name="Rewards" value="Confetti, gold rings" family="earned" onClick={() => go('/earned', { v: 'rewards' })} />
      </Doors>
      {themes && <ThemeSheet settings={settings} unlocked={unlocked} today={today} onClose={() => setThemes(false)} />}
    </div>
  );
}
