import { useState } from 'react';
import type { AchStats } from '../../domain/achStats';
import { ACTIVE_ACHIEVEMENTS, text, type AchDef, type Category } from '../../domain/achievements';
import { dayKey } from '../../domain/dates';
import { CaseGrid, CaseHead, Spotlight, type CaseItem } from './Case';

const TABS: { id: string; name: string; cats?: Category[] }[] = [
  { id: 'all', name: 'All' },
  { id: 'walk', name: 'Walk', cats: ['steps', 'india'] },
  { id: 'train', name: 'Train', cats: ['training', 'strength'] },
  { id: 'food', name: 'Food', cats: ['food', 'water'] },
  { id: 'body', name: 'Body', cats: ['sleep', 'body', 'joints'] },
  { id: 'secret', name: 'Secrets', cats: ['secret'] },
];
const TO_EARN = 9;

/** Earned as an achievement case (board W5): the count and bar, the newest on its stage, tabs by kind, then the medals, newest first. */
export function EarnedCase({ stats }: { stats: AchStats }) {
  const [tab, setTab] = useState('all');
  const [all, setAll] = useState(false);
  const item = (a: AchDef): CaseItem => {
    const u = stats.unlocked.get(a.id);
    return { id: a.id, name: a.name, cat: a.cat, tier: a.tier, earned: !!u, date: u ? dayKey(new Date(u.at)) : undefined, progress: !u && a.progress && !a.soon ? a.progress(stats) : undefined };
  };
  const items = ACTIVE_ACHIEVEMENTS.map(item);
  const got = items.filter((x) => x.earned).sort((a, b) => stats.unlocked.get(b.id)!.at - stats.unlocked.get(a.id)!.at);
  const newest = got[0];
  const cats = TABS.find((t) => t.id === tab)?.cats;
  const inTab = (x: CaseItem) => !cats || cats.includes(x.cat);
  const pct = (x: CaseItem) => (x.progress && x.progress[1] ? x.progress[0] / x.progress[1] : -1);
  const toEarn = items.filter((x) => !x.earned && inTab(x)).sort((a, b) => pct(b) - pct(a));
  const shown = [...got.filter(inTab), ...(all ? toEarn : toEarn.slice(0, TO_EARN))];
  return (
    <>
      <CaseHead got={got.length} total={items.length} />
      {newest && <Spotlight item={newest} line={text(ACTIVE_ACHIEVEMENTS.find((a) => a.id === newest.id)!.desc, stats)} />}
      <div className="k-pills" role="group" aria-label="Kinds">
        {TABS.map((t) => <button key={t.id} type="button" className="k-pill sm" aria-pressed={t.id === tab} onClick={() => { setTab(t.id); setAll(false); }}>{t.name}</button>)}
      </div>
      <h2 className="cs-k">The case <span>Newest first</span></h2>
      <CaseGrid key={tab} items={shown} />
      {toEarn.length > TO_EARN && <button type="button" className="ch-more" aria-expanded={all} onClick={() => setAll(!all)}>{all ? 'Show fewer' : `All ${toEarn.length} still to earn`}</button>}
    </>
  );
}
