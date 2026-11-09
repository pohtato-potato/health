// Everything the tree's screens show, worked out once from the save. Pure apart from the live query.
import { weekStart } from '../../../domain/dates';
import { BUNDLES, isOpen as bundleOpen } from '../../../football/ground';
import { BOON_CHOICES } from '../../../football/content/season';
import { PROJECTS } from '../../../football/content/projects';
import { STAFF } from '../../../football/content/staff';
import type { ProjectDef } from '../../../football/content/types';
import { activeFor, engineOf, userOf } from '../../../football/store/tree';
import { useTree, type TreeView } from '../../../football/store/treeActions';
import { projectOpen, skyline } from '../../../football/tree/projects';
import { bank, costOf, currentEra, erasOpen, erasUnseen, ruleValue, techById } from '../../../football/tree/research';
import { boonOffer, boonPickOpen, trackSteps } from '../../../football/tree/season';
import { doctorLevel, doctorNext, wageBill } from '../../../football/tree/staff';
import { fmtCount } from '../../../football/tree/words';

export type Model = ReturnType<typeof modelOf>;

export function modelOf(t: TreeView) {
  const eng = engineOf(t.save), user = userOf(t.save);
  const researched = user.researched.map((r) => r.id);
  const eurekas = eng.eurekas.map((e) => e.id);
  const a = activeFor(t.save, t.bundles);
  const states = new Map(t.bundles.map((b) => [b.id, b]));
  const gates = { tier: t.tier, moved: Boolean(t.save.moved), done: t.built, researched, budget: t.save.budget };
  const open = (p: ProjectDef) => (p.source === 'ground' ? bundleOpen(BUNDLES.find((b) => b.id === p.id)!, gates) : projectOpen(p, gates));
  /** "18 of 25" for its least-finished need; money waiting shows as "waiting for €400k". */
  const progress = (id: string) => {
    const p = PROJECTS.find((x) => x.id === id)!;
    const s = states.get(id);
    if (s?.done) return 'built';
    const needs = p.needs.map((n) => ({ n, have: Math.min(n.count, s?.progress[n.what] ?? 0) }));
    const worst = needs.sort((x, y) => x.have / x.n.count - y.have / y.n.count)[0];
    if (!worst || worst.have >= worst.n.count) return t.save.budget < p.money ? 'waiting for the money' : 'ready';
    return `${fmtCount(worst.have)} of ${fmtCount(worst.n.count)}`;
  };
  const season = t.save.season;
  const extra = eng.boonExtra?.[season] ?? 0;
  const pick = t.save.phase === 'season' ? boonPickOpen(user, season, t.save.day, extra) : undefined;
  const opened = new Set(user.opened.map((o) => o.id));
  const leave = new Set(eng.leave);
  const staff = STAFF.map((s) => ({
    s, tech: techById(s.tech)!, hired: researched.includes(s.tech), leave: leave.has(s.id), researching: user.target === s.tech,
  }));
  return {
    t, eng, user, researched, eurekas, active: a,
    bank: bank(eng, user),
    eras: erasOpen(researched), era: currentEra(researched), erasUnseen: erasUnseen(user),
    eurekasUnseen: eng.eurekas.filter((e) => !user.seenEurekas.includes(e.id) && !researched.includes(e.id)).map((e) => e.id),
    cost: (id: string) => costOf(techById(id)!, eurekas),
    places: skyline(gates, open),
    projectsOpen: PROJECTS.filter(open),
    states, progress,
    boonPick: pick,
    boonOffer: pick ? boonOffer(user, season, pick, ruleValue(a, 'boon-choices', BOON_CHOICES)) : [],
    packsWaiting: eng.packs.filter((p) => !opened.has(p.id)),
    week: weekStart(t.today),
    track: trackSteps(eng, season),
    staff,
    wages: wageBill(researched, t.tier),
    doctor: { xp: eng.doctorXp, level: doctorLevel(eng.doctorXp), next: doctorNext(eng.doctorXp) },
  };
}
export function useModel(): Model | null | undefined {
  const t = useTree();
  if (t === undefined) return undefined;
  return t ? modelOf(t) : null;
}
