// Football engine 2, layer 3 (the tree), inside the day-by-day play. play.ts calls these four hooks; nothing else
// in play.ts knows about the tree:
//   treeDay      every day, after the ground: habit counts, research, the track, bounties, projects, eurekas, the board
//   treeAbilities before a match: the tree's situational bonuses, boons and waiting boosts, as Brabo abilities
//   treeMatch    after a match: lesson points, a pack for a final won
//   treeSeasonEnd at the season's end: the board's verdicts, the tree's money, wages and leave, a promotion pack
// Taps (research, boons, bounties, packs, moments seen) write save.treeUser only, in store/treeActions.ts.
import { treeRotation } from '../tree/rotation';
import { addDays, daysBetween, weekStart, type DayKey } from '../../domain/dates';
import { paceOn, paceWeekDone } from '../pace';
import { BOARD, BOUNTIES, BOARD_RESEARCH, TRACK_KIT_PIECES, TRACK_THEMES } from '../content/season';
import { BOOSTS } from '../content/packs';
import { ERAS } from '../content/tree';
import type { Reward } from '../content/types';
import { reachOf } from '../continental';
import { ANTIGOON } from '../rivals';
import type { MatchCtx } from '../engine';
import type { Row } from '../table';
import type { BraboAbility, Tier } from '../types';
import { addMetrics, dayMetrics } from '../tree/metrics';
import { projectDay, projectOpen, TREE_PROJECTS } from '../tree/projects';
import { activeEffects, erasOpen, eurekasDue, lessonFor, LOGGED_DAY, settle, techById, type Active } from '../tree/research';
import { boardFor, boonsThisSeason, bountiesPicked, bountyProgress, objectiveMet, strengthOf, trackDue, type SeasonFacts } from '../tree/season';
import { boostsWaiting } from '../tree/packs';
import { doctorLevel, healDays, payWages, treeIncome } from '../tree/staff';
import { emptyEngine, emptyUser, type PackSource, type ResearchWhy, type TreeEngine, type TreeUser } from '../tree/types';
import type { Health } from './gather';
import { OWN } from './season';
import type { FbBundle, FbNews, FbSave, FbSeason, StoredMatch } from './tables';

/** Days of habit counts kept (eureka windows are at most 30 days, bounty weeks 7). */
export const KEEP_DAYS = 70;
const GAINS_KEPT = 60;

/** What the hooks need from play.ts's world. */
export interface TreeCtx {
  h: Health;
  save: FbSave;
  season: FbSeason;
  bundles: Map<string, FbBundle>;
  news: FbNews[];
  /** Every Brabo match so far, oldest first (stored and this play's). */
  matches: () => StoredMatch[];
  clubs: Map<string, { id: string; tier: Tier; rating: number }>;
}

export const engineOf = (s: FbSave): TreeEngine => s.tree ?? emptyEngine();
export const userOf = (s: FbSave): TreeUser => s.treeUser ?? emptyUser();
export const researchedOf = (s: FbSave) => userOf(s).researched.map((r) => r.id);
/** Every built project and ground bundle. */
export const builtOf = (bundles: Iterable<FbBundle>) => [...bundles].filter((b) => b.done).map((b) => b.id);

/** The effects switched on today: techs, staff at work, built projects, this season's boons, and any boosts named. */
export function activeFor(save: FbSave, bundles: Iterable<FbBundle>, boosts: string[] = []): Active {
  const eng = engineOf(save), user = userOf(save);
  return activeEffects({ researched: user.researched.map((r) => r.id), leave: eng.leave, projectsDone: builtOf(bundles), boons: boonsThisSeason(user, save.season), boosts });
}

function gain(eng: TreeEngine, on: DayKey, n: number, why: ResearchWhy, note?: string) {
  if (n <= 0) return;
  eng.earned += n;
  eng.gains = [...eng.gains, { on, n, why, ...(note ? { note } : {}) }].slice(-GAINS_KEPT);
}
function earnPack(eng: TreeEngine, on: DayKey, source: PackSource, season: number, size: 'normal' | 'big' | 'single' = 'normal') {
  const id = `${source}:${on}:${eng.packs.length}`;
  eng.packs = [...eng.packs, { id, on, source, size, season }];
}
/** Pays a reward from the track or a bounty. */
function pay(eng: TreeEngine, r: Reward, on: DayKey, season: number, source: PackSource, note: string) {
  switch (r.kind) {
    case 'pack': earnPack(eng, on, source, season, r.size === 'big' ? 'big' : 'normal'); break;
    case 'album-card': earnPack(eng, on, source, season, 'single'); break;
    case 'research': gain(eng, on, r.n, source === 'bounty' ? 'bounty' : 'pack', note); break;
    case 'boon-pick': eng.boonExtra = { ...eng.boonExtra, [season]: (eng.boonExtra?.[season] ?? 0) + 1 }; break;
    case 'kit-piece': eng.kitPieces = [...eng.kitPieces, TRACK_KIT_PIECES[(season - 1) % TRACK_KIT_PIECES.length].id]; break;
    case 'theme': eng.themes = [...eng.themes, TRACK_THEMES[(season - 1) % TRACK_THEMES.length].id]; break;
    case 'icon-odds': eng.iconOdds += r.pct; break;
    case 'track-catchup': eng.track = { ...eng.track, catchups: eng.track.catchups + 1 }; break;
    case 'money': case 'boost': break;
  }
}

/** Every day, after the ground: the tree's whole day. `youthDays` are academy-linked sessions today. */
export function treeDay(c: TreeCtx, date: DayKey, youthDays: number) {
  const s = c.save;
  const eng: TreeEngine = structuredClone(engineOf(s));
  let user: TreeUser = userOf(s);
  const researched = () => user.researched.map((r) => r.id);
  for (const e of erasOpen(researched())) if (!eng.eurekaBase[e]) eng.eurekaBase[e] = { on: date, m: { ...eng.total } };

  // 1. Habit counts.
  const m = dayMetrics(c.h, date, { bedtime: s.bedtime, youthDays });
  eng.days = [...eng.days.filter((d) => d.date !== date), { date, m }].slice(-KEEP_DAYS);
  eng.total = addMetrics(eng.total, m);
  if (m.logged) gain(eng, date, LOGGED_DAY, 'logged');

  // 2. The season track and the week's pack.
  if (s.phase === 'season') {
    if (eng.track.season !== s.season) eng.track = { season: s.season, steps: [], catchups: 0 };
    if (m.logged && !eng.track.steps.includes(date)) eng.track = { ...eng.track, steps: [...eng.track.steps, date] };
    // League pace (O36): the week's pack counts real weeks of the pace, not season days that now pass three at a time.
    if ((paceOn(s, date) ? paceWeekDone(s.pace!, date, daysBetween) : s.day % 7 === 0) && !(s.globe?.breaks ?? []).some((b) => b.days.includes(date)) && eng.days.some((d) => d.date > addDays(date, -7) && d.m.logged)) earnPack(eng, date, 'week-finished', s.season);
  }

  // 3. Bounties picked this week.
  const week = weekStart(date);
  for (const id of bountiesPicked(user, week)) {
    const key = `${week}:${id}`;
    const b = BOUNTIES.find((x) => x.id === id); // picks were checked against the offer when made
    if (!b || eng.bountiesDone.includes(key)) continue;
    if (bountyProgress(eng, b, week, date) >= b.target.count) {
      eng.bountiesDone = [...eng.bountiesDone, key];
      pay(eng, b.reward, date, s.season, 'bounty', b.name);
      c.news.push({ id: `${date}:bounty:${id}`, date, kind: 'club', text: `Bounty done: ${b.name}.` });
    }
  }
  // Track rewards (after bounties, so a catch-up step pays the same day).
  if (s.phase === 'season') for (const step of trackDue(eng, s.season)) {
    eng.trackPaid = [...eng.trackPaid, `${s.season}:${step.step}`];
    pay(eng, step.reward!, date, s.season, 'track', `Track day ${step.step}`);
  }

  // 4. The club doctor: experience on days every medicine was kept, while at work.
  if (researched().includes('p-physioroom') && !eng.leave.includes('club-doctor') && m.meds) {
    const before = doctorLevel(eng.doctorXp);
    eng.doctorXp++;
    if (doctorLevel(eng.doctorXp) > before) c.news.push({ id: `${date}:doctor`, date, kind: 'club', text: `The club doctor reaches level ${doctorLevel(eng.doctorXp)}. Knocks heal a day sooner.` });
  }

  // 5. Projects from the tree: new stages and journeys.
  const tier = c.season.tierOf[OWN];
  const g = { tier, moved: Boolean(s.moved), done: builtOf(c.bundles.values()), researched: researched() };
  for (const p of TREE_PROJECTS) {
    if (!projectOpen(p, g)) continue;
    const cur = c.bundles.get(p.id) ?? { id: p.id, progress: {} };
    const { state, spent } = projectDay(p, cur, m, s.budget, date);
    c.bundles.set(p.id, state);
    if (!state.done) continue;
    s.budget = Math.round((s.budget - spent) * 1000) / 1000;
    g.done = [...g.done, p.id];
    if (p.place) s.openings = [...(s.openings ?? []), p.id];
    c.news.push({ id: `${date}:built:${p.id}`, date, kind: 'club', text: `${p.name} is ${p.place ? 'built' : 'done'}. ${p.reward}` });
  }

  // 6. Eurekas, then the bank settles the tech being saved for.
  for (const id of eurekasDue(eng, researched(), date)) {
    eng.eurekas = [...eng.eurekas, { id, on: date }];
    c.news.push({ id: `${date}:eureka:${id}`, date, kind: 'club', text: `Eureka: ${techById(id)!.name} costs half. ${techById(id)!.eureka.text}` });
  }
  const st = settle(eng, user, date);
  user = st.user;
  for (const id of st.done) c.news.push({ id: `${date}:tech:${id}`, date, kind: 'club', text: `Researched: ${techById(id)!.name}.` });
  for (const e of erasOpen(researched())) if (!eng.eurekaBase[e]) {
    eng.eurekaBase[e] = { on: date, m: { ...eng.total } };
    c.news.push({ id: `${date}:era:${e}`, date, kind: 'club', text: `A new era: ${ERAS.find((x) => x.id === e)!.name}.` });
  }

  // 7. The board sets its two objectives on the season's first day.
  if (s.phase === 'season' && !eng.board.some((b) => b.season === s.season)) {
    const ids = Object.keys(c.season.tierOf).filter((id) => c.season.tierOf[id] === tier && id !== OWN);
    const own = c.clubs.get(OWN)?.rating ?? 50;
    const strength = strengthOf(own, ids.map((id) => c.clubs.get(id)?.rating ?? 50));
    const derbyOn = c.season.tierOf[ANTIGOON] === tier;
    const objs = boardFor(s.season, strength, { inContinental: Boolean(c.season.continental?.field.includes(OWN)), derbyOn, divisionSize: ids.length + 1, topTier: tier === 1 });
    eng.board = [...eng.board, { season: s.season, strength, ids: objs.map((o) => o.id) }];
  }
  s.tree = eng;
  s.treeUser = user;
}

/** Waiting boosts that fit this match: a derby boost waits for a derby, a cup boost for a cup night, a home boost for home. */
function boostFits(id: string, ctx: MatchCtx, home: boolean): boolean {
  const b = BOOSTS.find((x) => x.id === id);
  if (!b || b.kind === 'kit-trim') return false;
  const w = 'when' in b.effect ? b.effect.when : 'always';
  if (w === 'derby') return Boolean(ctx.derby);
  if (w === 'cup') return ['bigcup', 'tiercup', 'playoff', 'continental', 'clubworld', 'event'].includes(ctx.comp ?? '');
  if (w === 'home-late' || w === 'home') return home;
  return true;
}
/**
 * Before a match: the tree's situational bonuses as Brabo abilities (under the ±3 cap), the knock healing, and the
 * boosts used tonight (marked used on the save).
 */
export function treeAbilities(c: Pick<TreeCtx, 'save' | 'bundles'>, ctx: MatchCtx, home: boolean): { abilities: BraboAbility[]; heal: number; boosts: string[] } {
  const eng = engineOf(c.save), user = userOf(c.save);
  const waiting = boostsWaiting(user, eng.boostsUsed).filter((b) => boostFits(b.id, ctx, home));
  const a = activeFor(c.save, c.bundles.values(), waiting.map((b) => b.id));
  const abilities: BraboAbility[] = [];
  a.named.forEach(({ name, effect: e }, i) => {
    if (e.kind === 'axis') abilities.push({ id: `tree:${i}`, name, axis: e.axis, d: e.d, when: e.when, side: e.side === 'both' ? undefined : e.side, tree: true });
    if (e.kind === 'retake') abilities.push({ id: `tree-retake:${i}`, name, when: e.when === 'always' ? undefined : e.when, retake: true });
  });
  if (waiting.length) c.save.tree = { ...eng, boostsUsed: [...eng.boostsUsed, ...waiting.map((b) => b.key)] };
  const doctorAtWork = researchedOf(c.save).includes('p-physioroom') && !eng.leave.includes('club-doctor');
  return { abilities, heal: healDays(a, eng.doctorXp, doctorAtWork), boosts: waiting.map((b) => b.id) };
}

/** After a match: lesson points (losses teach the most), and a pack for a final won. */
export function treeMatch(c: Pick<TreeCtx, 'save' | 'bundles'>, m: StoredMatch) {
  const eng = structuredClone(engineOf(c.save));
  const a = activeFor(c.save, c.bundles.values());
  const l = lessonFor(m.result, a);
  gain(eng, m.date, l.n, l.why);
  if (m.result === 'W' && /(^|, )Final$|Playoff final/.test(m.round ?? '')) earnPack(eng, m.date, 'final-won', c.save.season);
  c.save.tree = eng;
}

/** The season's facts the board reads. */
export function seasonFacts(c: Pick<TreeCtx, 'season' | 'save'> & { matches: StoredMatch[] }, tables: Record<Tier, Row[]>, promoted: boolean): SeasonFacts {
  const tier = c.season.tierOf[OWN];
  const rows = tables[tier] ?? [];
  const pos = Math.max(1, rows.findIndex((r) => r.id === OWN) + 1);
  const mine = c.matches.filter((m) => m.season === c.save.season);
  const league = mine.filter((m) => m.comp === 'league');
  let run = 0, best = 0;
  for (const m of league.filter((x) => x.braboHome)) { run = m.result === 'L' ? 0 : run + 1; best = Math.max(best, run); }
  const reached = (b?: { rounds: { name: string; ties: { home: string; away: string | null }[] }[]; winner?: string }) =>
    b ? [...b.rounds.filter((r) => r.ties.some((t) => t.home === OWN || t.away === OWN)).map((r) => r.name), ...(b.winner === OWN ? ['win'] : [])] : [];
  const tc = Object.values(c.season.tiercups).find((b) => b.rounds.some((r) => r.ties.some((t) => t.home === OWN || t.away === OWN)));
  const ant = c.season.tierOf[ANTIGOON];
  const antPos = rows.findIndex((r) => r.id === ANTIGOON) + 1;
  const reach = reachOf(c.season.continental, OWN);
  const contMap = { phase: 'group', qf: 'r16', sf: 'sf', final: 'final', winner: 'final' } as const;
  return {
    position: pos, divisionSize: rows.length, promoted,
    playoffs: Boolean(c.season.playoffs[tier]?.semis?.some(([h, aw]) => h === OWN || aw === OWN)),
    goals: rows.find((r) => r.id === OWN)?.gf ?? 0,
    cleanSheets: mine.filter((m) => m.score[1] === 0).length,
    derbyWins: mine.filter((m) => m.opp === ANTIGOON && m.result === 'W').length,
    homeUnbeaten: best,
    aboveRival: ant === undefined ? undefined : ant > tier ? true : ant < tier ? false : antPos ? pos < antPos : undefined,
    bigcup: reached(c.season.bigcup), tiercup: reached(tc),
    continental: reach ? contMap[reach] : undefined,
    inContinental: Boolean(c.season.continental?.field.includes(OWN)),
    derbyOn: ant === tier,
  };
}

/**
 * The season's end (after the income is in): the board's verdicts (10 research each met, a dry note otherwise), the
 * tree's money, a pack for promotion, then wages in hiring order. Staff the budget can't cover go on leave.
 */
export function treeSeasonEnd(c: TreeCtx, date: DayKey, tables: Record<Tier, Row[]>, promoted: boolean, base: { gate: number; tv: number; sponsors: number; shop: number; continental: number }) {
  const s = c.save;
  const eng = structuredClone(engineOf(s));
  const facts = seasonFacts({ season: c.season, save: s, matches: c.matches() }, tables, promoted);
  const set = eng.board.find((b) => b.season === s.season);
  if (set && !set.verdicts) {
    set.verdicts = set.ids.map((id) => ({ id, met: objectiveMet(BOARD.find((o) => o.id === id)!, facts) }));
    for (const v of set.verdicts) {
      const o = BOARD.find((x) => x.id === v.id)!;
      if (v.met) gain(eng, date, BOARD_RESEARCH, 'board', o.text);
      c.news.push({ id: `${date}:board:${o.id}`, date, kind: 'club', text: `From the chairman: ${v.met ? o.met : o.missed}` });
    }
  }
  if (promoted) earnPack(eng, date, 'promotion', s.season);
  const tier = c.season.tierOf[OWN];
  const a = activeFor(s, c.bundles.values());
  const lines = treeIncome(a, tier, base);
  if (lines.length) {
    const sum = lines.reduce((t, l) => t + l.amount, 0);
    s.budget = Math.round((s.budget + sum) * 1000) / 1000;
    s.income = s.income ? { ...s.income, lines: [...s.income.lines, ...lines] } : { season: s.season, lines };
  }
  const bill = payWages(researchedOf(s), tier, s.budget);
  s.budget = bill.budget;
  const back = eng.leave.filter((id) => !bill.leave.includes(id));
  const off = bill.leave.filter((id) => !eng.leave.includes(id));
  eng.leave = bill.leave;
  eng.wages = { season: s.season, paid: bill.paid, staff: bill.staff };
  if (bill.paid) s.income = { ...(s.income ?? { season: s.season, lines: [] }), lines: [...(s.income?.lines ?? []), { name: 'Staff wages', amount: -bill.paid }] };
  if (off.length) c.news.push({ id: `${date}:leave`, date, kind: 'club', text: `${off.length === 1 ? 'One of the staff goes' : `${off.length} staff go`} on leave until the budget can cover the wages. No debt.` });
  if (back.length) c.news.push({ id: `${date}:back`, date, kind: 'club', text: `Back from leave: wages covered again.` });
  s.tree = eng;
}

/** Knock healing tonight (the physio, the recovery pool, the club doctor's levels). */
export function healNow(save: FbSave, bundles: Map<string, FbBundle>): number {
  const eng = engineOf(save);
  const doctorAtWork = researchedOf(save).includes('p-physioroom') && !eng.leave.includes('club-doctor');
  return healDays(activeFor(save, bundles.values()), eng.doctorXp, doctorAtWork);
}
/** Seats the tree's new stages add (upper tiers, corners); ground.ts counts the shipped stands. */
export const stageCapacity = (done: string[]) => TREE_PROJECTS.filter((p) => p.capacity && done.includes(p.id)).reduce((t, p) => t + p.capacity!, 0);

/** The tree's hand on tonight's rotation: rules, open formations, unit captains (see tree/rotation.ts). */
export const rotationOf = (save: FbSave, bundles: Iterable<FbBundle>) => treeRotation(activeFor(save, bundles));
