import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState, type CSSProperties } from 'react';
import { patchSettings } from '../db/actions';
import { db } from '../db/db';
import { useAllDays, useAllEntries, useAllSets, useSessions, useSettings, useSightings, useToday } from '../db/hooks';
import { CONFETTI, hasReward, rewardAch, TITLES, xpFrom, levelOf } from '../domain/rewards';
import { availableThemes } from '../domain/themes';
import { TITLE_DEFS, titleStats, wornTitle } from '../domain/titles';
import { prefOn, type Settings } from '../domain/types';
import { back } from '../router';
import { summaries } from '../state/Challenge';
import { PageHead } from '../ui/kit/Kit';
import { ThemeSheet, useUnlockedIds } from '../ui/Theme';
import { useToast } from '../ui/Toasts';
import { Nameplate, RewardRows, ThemeSwatches, Wardrobe, type RewardRow, type WardrobeRow } from './earned/CharacterParts';
import { wear } from './earned/TitlesWall';

export function useLevel() {
  const settings = useSettings();
  const days = useAllDays();
  const entries = useAllEntries();
  const sessions = useSessions();
  const unlocked = useUnlockedIds();
  const checkins = useLiveQuery(() => db.checkins.count(), []);
  const today = useToday();
  if (!settings || !days || !entries || !sessions || !unlocked || checkins === undefined) return undefined;
  const all = summaries(settings, days, entries, days.reduce((m, d) => (d.date < m ? d.date : m), today), today);
  const xp = xpFrom([...unlocked], { perfect: all.filter((d) => d.perfect).length, sessions: sessions.filter((s) => s.status === 'done').length, checkins });
  return { ...levelOf(xp), unlocked, settings, days, entries, sessions, all };
}

/** What the titles are judged on, from everything logged. */
export function useTitleStats(lv: ReturnType<typeof useLevel>) {
  const today = useToday();
  const sets = useAllSets();
  const sightings = useSightings();
  const forecasts = useLiveQuery(() => db.forecasts.toArray(), []);
  const usage = useLiveQuery(() => db.usage.where('kind').equals('open').toArray(), []);
  const edits = useLiveQuery(() => db.edits.count(), []);
  const ready = lv && sets && sightings && forecasts && usage && edits !== undefined;
  return useMemo(() => (ready ? titleStats({
    today, settings: lv.settings, days: lv.days, entries: lv.entries, sessions: lv.sessions, sets, sightings, forecasts, usage, edits,
  }) : undefined), [ready, today, lv?.settings, lv?.days, lv?.entries, lv?.sessions, sets, sightings, forecasts, usage, edits]); // eslint-disable-line react-hooks/exhaustive-deps
}

const lockedLine = (r: string) => {
  const a = rewardAch(r);
  return a ? (a.cat === 'secret' ? 'Unlocked by a secret achievement' : `Unlock: ${a.name}`) : '';
};

function rewardRows(settings: Settings, unlocked: Set<string>): RewardRow[] {
  const row = (id: string, name: string, reward: string, c: string, line: string, on: boolean, set: (v: boolean) => void): RewardRow => {
    const open = hasReward(unlocked, reward);
    return { id, name, c, open, on, line: open ? line : lockedLine(reward), onToggle: set };
  };
  return [
    row('goldRings', 'Gold rings', 'Gold rings', '#ffc94d', 'Closed rings on Today turn gold', prefOn(settings.prefs, 'goldRings'), (v) => void patchSettings((s) => ({ prefs: { ...s.prefs, goldRings: v } }))),
    row('gym', 'Gym mode', 'Gym mode', '#b9a0ff', 'Loads from a full dumbbell rack, not your plates', !!settings.equipment.gym, (v) => void patchSettings((s) => ({ equipment: { ...s.equipment, gym: v } }))),
    row('goldRoute', 'Gold route', 'A gold route on your map', '#ff9a5c', 'Your walked route is drawn in gold', prefOn(settings.prefs, 'goldRoute'), (v) => void patchSettings((s) => ({ prefs: { ...s.prefs, goldRoute: v } }))),
  ];
}

/** Character (board W9): the title you wear, your wardrobe of titles, the rewards you have switched on, and your theme. */
export function CharacterPage() {
  const lv = useLevel();
  const stats = useTitleStats(lv);
  const today = useToday();
  const toast = useToast();
  const [more, setMore] = useState(false);
  const [themes, setThemes] = useState(false);
  if (!lv || !stats) return <div className="page bare k-page k-light you" />;
  const { settings, unlocked, level } = lv;
  const all: WardrobeRow[] = [
    ...TITLE_DEFS.map((t) => ({ id: t.id, name: t.name, how: t.how, has: t.rule(stats) })),
    ...TITLES.map((t) => ({ id: t.id, name: t.name, how: t.how, has: t.unlocked(unlocked, level) })),
  ];
  const had = all.filter((t) => t.has);
  const toEarn = all.filter((t) => !t.has);
  const worn = wornTitle(settings, unlocked, level);
  const reward = (r: string) => hasReward(unlocked, r);
  const confetti = settings.confetti ?? 'classic';
  return (
    <div className="page bare k-page k-light you ch-page">
      <PageHead back="Earned" onBack={() => back('/earned')} title="Character" family="earned" />
      <Nameplate worn={worn} level={level} earned={had.length} />

      <h2 className="ch-k">Wardrobe <span>Tap a title to wear it</span></h2>
      <Wardrobe rows={more ? [...had, ...toEarn] : had} worn={settings.title} onWear={(r) => wear(settings, r.id, r.name, toast)} />
      {toEarn.length > 0 && <button type="button" className="ch-more" aria-expanded={more} onClick={() => setMore(!more)}>{more ? 'Hide the ones to earn' : `${toEarn.length} more to earn`}</button>}

      <h2 className="ch-k" style={{ '--c': '#ff6fa8' } as CSSProperties}>Rewards</h2>
      <div className="ch-conf" role="group" aria-label="Confetti">
        <b>Confetti</b>
        <div>
          {CONFETTI.map((c) => {
            const open = !c.reward || reward(c.reward);
            return (
              <button key={c.id} type="button" disabled={!open} aria-pressed={confetti === c.id} title={open ? undefined : lockedLine(c.reward!)} onClick={() => void patchSettings({ confetti: c.id })}>
                {c.palette.length > 0 && <span aria-hidden="true">{c.palette.slice(0, 4).map((p) => <i key={p} style={{ background: p }} />)}</span>}
                {c.name}
              </button>
            );
          })}
        </div>
      </div>
      <RewardRows rows={rewardRows(settings, unlocked)} />

      <h2 className="ch-k" style={{ '--c': '#4fd2ff' } as CSSProperties}>Theme</h2>
      <ThemeSwatches themes={availableThemes(unlocked).map((t) => ({ id: t.id, name: t.name, colours: t.swatch }))} picked={settings.theme ?? 'dusk'} onPick={(id) => void patchSettings({ theme: id as Settings['theme'] })} />
      <button type="button" className="ch-more" onClick={() => setThemes(true)}>Every theme, and how to earn them</button>
      {themes && <ThemeSheet settings={settings} unlocked={unlocked} today={today} onClose={() => setThemes(false)} />}
    </div>
  );
}
