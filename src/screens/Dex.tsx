import { db } from '../db/db';
import { useSettings, useSightings, useToday, useAllDays } from '../db/hooks';
import { CREATURES, creatureById, nameAt, noteAt, stageWord, tierWord } from '../domain/creatureRoster';
import { dexRows, earnedRingStyles, grownOn, maxStage, notesSoFar, oddsFor } from '../domain/creatures';
import { go, useRoute } from '../router';
import '../styles/creatures.css';
import { CreatureFigure, StageDots } from '../ui/creatures/Figure';
import { DexGrid } from '../ui/creatures/DexGrid';
import { RegionFrame } from '../ui/live/RegionFrame';

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** The dex on You: the sky of what's been found, cards a tap away, how it works and what's been earned. Unfound creatures never appear. */
export function DexPage() {
  const { params } = useRoute();
  const sightings = useSightings();
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  if (!sightings || !settings || !days) return <div className="page" />;
  const rows = dexRows(sightings, CREATURES);
  const view = params.get('view');
  const open = rows.find((r) => r.id === params.get('c'));
  const nav = (
    <div className="dex-nav">
      {[['Sky', '/dex', {}], ['Cards', '/dex', { view: 'cards' }], ['How it works', '/dex', { view: 'how' }], ['Themes', '/dex', { view: 'themes' }]].map(([label, path, p]) => (
        <button key={label as string} type="button" className="btn ghost" onClick={() => go(path as string, p as Record<string, string>)}>{label as string}</button>
      ))}
    </div>
  );
  if (open) {
    const c = creatureById(open.id)!;
    return (
      <RegionFrame>
        <h1 className="h1">{nameAt(c, open.stage)}</h1>
        {nav}
        <CreatureFigure c={c} stage={open.stage} draw={false} burst={false} />
        <span className="t14">{tierWord(c)} · {open.visits} visit{open.visits === 1 ? '' : 's'}</span>
        <StageDots c={c} stage={open.stage} of={maxStage(c.tier)} word={stageWord(c, open.stage)} />
        <div className="card">
          {(c.tier === 'rare' ? [noteAt(c, open.visits)] : notesSoFar(c.notes, open.visits)).map((n) => <p key={n} className="t15">{n}</p>)}
        </div>
        <button type="button" className="btn lg block" onClick={() => go('/dawn', { replay: c.id })}>Replay</button>
      </RegionFrame>
    );
  }
  if (view === 'how') {
    const night = { perfect: false, records: 0, sleepMin: 420 };
    const odds = oddsFor(night);
    const after = oddsFor({ ...night, perfect: true });
    return (
      <RegionFrame>
        <h1 className="h1">How it works</h1>
        {nav}
        <div className="card">
          <p className="t15">After 7 hours of sleep or more, 3 visitors come. After 6 to 7 hours, 2. Under 6, 1.</p>
          <p className="t15">On an ordinary night: a medium-rare visitor {pct(odds.medium)}, a rare guest {pct(odds.rare)}.</p>
          <p className="t15">After a perfect day: a medium-rare visitor {pct(after.medium)}, a rare guest {pct(after.rare)}. Two or more records and a good night add more.</p>
          <p className="t15">With no rare guest in 45 days, the next perfect day brings one.</p>
          <p className="t15">So far: {(['everyday', 'medium', 'rare'] as const).map((t) => `${rows.filter((r) => r.tier === t).length} ${t === 'medium' ? 'medium-rare' : t}`).join(', ')}.</p>
        </div>
      </RegionFrame>
    );
  }
  if (view === 'themes') {
    const themes = grownOn(sightings).map((g) => creatureById(g.id)!);
    const styles = earnedRingStyles(sightings).map((id) => creatureById(id)!);
    const worn = days.find((d) => d.date === today)?.theme;
    return (
      <RegionFrame>
        <h1 className="h1">Themes</h1>
        {nav}
        {!themes.length && !styles.length && <p className="t15">Nothing earned yet. A grown creature gives a theme day; a legend or a completed guest gives a ring style.</p>}
        {themes.map((c) => (
          <div key={c.id} className="card">
            <b>{c.theme?.name}</b>
            <span className="t14">{c.theme?.why}</span>
            <button type="button" className="btn ghost" aria-pressed={worn === c.id} onClick={() => void db.days.where('date').equals(today).count().then(async (n) => (n ? db.days.update(today, { theme: worn === c.id ? undefined : c.id }) : db.days.put({ date: today, theme: c.id })))}>
              {worn === c.id ? 'Worn today ✓' : 'Wear today'}
            </button>
          </div>
        ))}
        {styles.map((c) => (
          <div key={c.id} className="card">
            <b>{c.ring?.name} rings</b>
            <button type="button" className="btn ghost" aria-pressed={settings.ringStyle === c.id} onClick={() => void db.settings.update('app', { ringStyle: settings.ringStyle === c.id ? undefined : c.id })}>
              {settings.ringStyle === c.id ? 'Worn ✓ (tap for plain)' : 'Wear these'}
            </button>
          </div>
        ))}
      </RegionFrame>
    );
  }
  return (
    <RegionFrame>
      <h1 className="h1">{view === 'cards' ? 'Cards' : 'Your night sky'}</h1>
      {nav}
      {!rows.length && <p className="t15">Nothing has visited yet. The first come after a morning log with sleep in it.</p>}
      <DexGrid rows={rows} cards={view === 'cards'} onOpen={(id) => go('/dex', { c: id })} />
    </RegionFrame>
  );
}
