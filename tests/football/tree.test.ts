// Engine 2, layer 3 (the tree): research and eras, eurekas, projects and stages, staff wages and leave, the club
// doctor, boons and bounties, the season track, packs, duplicates and the running-low rule, situational bonuses.
import { describe, expect, it } from 'vitest';
import { addDays, weekStart, type DayKey } from '../../src/domain/dates';
import type { Day, Settings, TrainingSession } from '../../src/domain/types';
import { ALBUM_CARDS, DUPLICATE_RESEARCH } from '../../src/football/content/album';
import { BOONS, BOON_CHOICES, BOUNTIES, TRACK } from '../../src/football/content/season';
import { PROJECTS } from '../../src/football/content/projects';
import { ERAS, TECHS } from '../../src/football/content/tree';
import { WAGE_UNIT } from '../../src/football/content/money';
import { STAFF } from '../../src/football/content/staff';
import type { BoardObjective } from '../../src/football/content/types';
import { physio } from '../../src/football/discipline';
import { playMatch } from '../../src/football/engine';
import { opponentFor } from '../../src/football/opponent';
import { clubById } from '../../src/football/data/load';
import type { Health } from '../../src/football/store/gather';
import type { FbBundle, FbSave, FbSeason, StoredMatch } from '../../src/football/store/tables';
import { treeAbilities, treeDay, treeMatch, treeSeasonEnd, type TreeCtx } from '../../src/football/store/tree';
import { dayMetrics } from '../../src/football/tree/metrics';
import { albumProgress, collected, openPack, poolCounts, runningLowNow } from '../../src/football/tree/packs';
import { projectDay, projectOpen, skyline } from '../../src/football/tree/projects';
import { activeEffects, bank, costOf, erasOpen, eurekasDue, formationsOpen, lessonFor, research, ruleValue, settle, techState } from '../../src/football/tree/research';
import { boardFor, boonOffer, boonPickOpen, bountyOffer, bountyProgress, objectiveMet, strengthOf, trackDue, trackSteps, type SeasonFacts } from '../../src/football/tree/season';
import { doctorLevel, healDays, payWages, wageBill } from '../../src/football/tree/staff';
import { formationFor, sheetFor, treeRotation } from '../../src/football/tree/rotation';
import { BASE_RULES } from '../../src/football/rotation/rules';
import { chemistryAfter, nudgesFor } from '../../src/football/rotation/night';
import { emptyEngine, emptyUser, type TreeEngine, type TreeUser } from '../../src/football/tree/types';
import { AXES, type AxisValues } from '../../src/football/types';

const D0 = '2026-10-05'; // a Monday
const settings = (extra: Partial<Settings> = {}) => ({
  targets: [{ from: '2026-01-01', targets: { kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 } }],
  checklist: [{ id: 'brush', name: 'Brush', slots: ['am'], active: true }, { id: 'pill', name: 'Pill', slots: ['am'], active: true, med: true }],
  ...extra,
}) as unknown as Settings;
function health(p: Partial<Health> = {}): Health {
  return { settings: settings(), days: new Map(), sessions: [], kcal: new Map(), measures: [], sets: [], meals: new Map(), walks: [], routes: [], ...p };
}
const days = (xs: Partial<Day>[]) => new Map(xs.map((d) => [d.date!, d as Day]));
const sess = (id: string, date: DayKey): TrainingSession => ({ id, date, session: 'A', planName: 'P', startedAt: 1, status: 'done', short: false, exercises: [] }) as unknown as TrainingSession;
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);
const user = (researched: string[] = [], extra: Partial<TreeUser> = {}): TreeUser => ({ ...emptyUser(), researched: researched.map((id) => ({ id, on: D0, cost: 0 })), ...extra });
const engine = (extra: Partial<TreeEngine> = {}): TreeEngine => ({ ...emptyEngine(), ...extra });
const eraTechs = (era: string, n: number) => TECHS.filter((t) => t.era === era).slice(0, n).map((t) => t.id);

describe('research and eras', () => {
  it('six eras cost 20, 35, 55, 80, 110, 150 per tech', () => {
    expect(ERAS.map((e) => e.cost)).toEqual([20, 35, 55, 80, 110, 150]);
    for (const t of TECHS) expect(t.cost).toBe(ERAS.find((e) => e.id === t.era)!.cost);
  });
  it('an era opens after 6 techs from the era before, by research alone', () => {
    expect(erasOpen([])).toEqual(['sunday']);
    expect(erasOpen(eraTechs('sunday', 5))).toEqual(['sunday']);
    expect(erasOpen(eraTechs('sunday', 6))).toEqual(['sunday', 'semipro']);
    // Techs from a later era never count toward an earlier one's entry.
    expect(erasOpen([...eraTechs('sunday', 6), ...eraTechs('semipro', 5)])).toEqual(['sunday', 'semipro']);
    expect(erasOpen([...eraTechs('sunday', 6), ...eraTechs('semipro', 6)])).toContain('pro');
  });
  it('a tech in a sealed era or with a missing prerequisite cannot be researched', () => {
    const kitman = TECHS.find((t) => t.id === 's-kitman')!;
    expect(techState(kitman, [])).toBe('locked');
    expect(techState(kitman, ['s-kitsponsor'])).toBe('open');
    expect(techState(TECHS.find((t) => t.id === 'p-4231')!, ['s-442'])).toBe('sealed');
  });
  it('lesson points: win 2, draw 2, loss 3; the press officer adds one for a loss', () => {
    const none = activeEffects({ researched: [], leave: [], projectsDone: [], boons: [] });
    expect([lessonFor('W', none).n, lessonFor('D', none).n, lessonFor('L', none).n]).toEqual([2, 2, 3]);
    const press = activeEffects({ researched: ['r-pressoffice'], leave: [], projectsDone: [], boons: [] });
    expect(lessonFor('L', press).n).toBe(4);
    const away = activeEffects({ researched: ['r-pressoffice'], leave: ['press-officer'], projectsDone: [], boons: [] });
    expect(lessonFor('L', away).n).toBe(3);
  });
  it('research completes when the bank covers it; otherwise the bank saves for it', () => {
    const eng = engine({ earned: 15 });
    const r1 = research(eng, user(), 's-442', D0);
    expect(r1.done).toEqual([]);
    expect(r1.user.target).toBe('s-442');
    const r2 = settle({ ...eng, earned: 25 }, r1.user, D0);
    expect(r2.done).toEqual(['s-442']);
    expect(r2.user.researched[0]).toMatchObject({ id: 's-442', cost: 20 });
    expect(bank({ ...eng, earned: 25 }, r2.user)).toBe(5);
  });
  it('techs never add flat rating points: no effect is an unconditional axis bonus', () => {
    for (const t of TECHS) for (const e of t.effects) if (e.kind === 'axis') expect(e.when).not.toBe('always');
  });
});

describe('eurekas', () => {
  it('a eureka halves the cost', () => {
    const t = TECHS.find((x) => x.id === 's-442')!;
    expect(costOf(t, [])).toBe(20);
    expect(costOf(t, ['s-442'])).toBe(10);
  });
  it('counts only from the day its era opened, inside its window', () => {
    // s-442: three sessions in a week.
    const base = { sunday: { on: D0, m: {} } };
    const dayRows = [0, 2, 4].map((i) => ({ date: addDays(D0, i), m: { training: 1 } }));
    expect(eurekasDue(engine({ eurekaBase: base, days: dayRows }), [], addDays(D0, 4))).toContain('s-442');
    // Spread over two weeks: not within 7 days.
    const spread = [0, 5, 10].map((i) => ({ date: addDays(D0, i), m: { training: 1 } }));
    expect(eurekasDue(engine({ eurekaBase: base, days: spread }), [], addDays(D0, 10))).not.toContain('s-442');
    // Sessions before the era opened don't count.
    expect(eurekasDue(engine({ eurekaBase: { sunday: { on: addDays(D0, 3), m: {} } }, days: dayRows }), [], addDays(D0, 4))).not.toContain('s-442');
  });
  it('a eureka without a window counts lifetime totals since the era opened', () => {
    // s-kitsponsor: anything logged on 7 days.
    const e = engine({ eurekaBase: { sunday: { on: D0, m: { logged: 3 } } }, total: { logged: 9 } });
    expect(eurekasDue(e, [], D0)).not.toContain('s-kitsponsor');
    expect(eurekasDue({ ...e, total: { logged: 10 } }, [], D0)).toContain('s-kitsponsor');
  });
});

describe('projects and stages, one list', () => {
  it('every shipped bundle appears once, and new stages need their tech', () => {
    const tea = PROJECTS.find((p) => p.id === 'cafe-tea')!;
    const g = { tier: 6 as const, moved: false, done: ['cafe-1'], researched: [] as string[] };
    expect(projectOpen(tea, g)).toBe(false);
    expect(projectOpen(tea, { ...g, researched: ['s-teahut'] })).toBe(true);
  });
  it('a stage grows with real counts and is paid for only when the budget covers it (no debt)', () => {
    const tea = PROJECTS.find((p) => p.id === 'cafe-tea')!;
    let s: FbBundle = { id: tea.id, progress: {} };
    for (let i = 0; i < 7; i++) s = projectDay(tea, s, { steps: 1 }, 1, addDays(D0, i)).state;
    expect(s.done).toBeUndefined();
    const poor = projectDay(tea, s, { steps: 1 }, 0, addDays(D0, 7));
    expect(poor.state.done).toBeUndefined();
    expect(poor.spent).toBe(0);
    const paid = projectDay(tea, poor.state, {}, 1, addDays(D0, 8));
    expect(paid.state.done).toBe(addDays(D0, 8));
    expect(paid.spent).toBe(tea.money);
  });
  it('journeys count kilometres', () => {
    const road = PROJECTS.find((p) => p.id === 'long-road')!;
    const r = projectDay(road, { id: road.id, progress: { km: 999.5 } }, { km: 0.6 }, 0, D0);
    expect(r.state.done).toBe(D0);
  });
  it('the skyline: built is solid, open is building, the first closed stage is next, the rest sealed', () => {
    const done = ['plot', 'kaai-stand'];
    const open = new Set(['river-end']);
    const sky = skyline({ tier: 5, moved: true, done, researched: [] }, (p) => open.has(p.id));
    const kaai = sky.find((p) => p.place === 'kaai')!;
    expect(kaai.stages.slice(0, 4).map((s) => s.look)).toEqual(['built', 'built', 'building', 'next']);
    expect(kaai.stages.at(-1)!.look).toBe('sealed');
    expect(sky.map((p) => p.place)).toEqual(['kaai', 'shop', 'cafe', 'academy', 'training', 'museum', 'ferry']);
  });
});

describe('staff, wages and leave', () => {
  it('no staff limit: every staff tech is hired', () => {
    const all = STAFF.map((s) => s.tech);
    expect(activeEffects({ researched: all, leave: [], projectsDone: [], boons: [] }).named.length).toBeGreaterThanOrEqual(STAFF.length - 1);
  });
  it('wages are paid in hiring order; staff the budget cannot cover go on leave; no debt', () => {
    const order = ['s-kitsponsor', 's-kitman', 's-442', 's-fiveaside', 'p-physio'];
    const kit = 0.5 * WAGE_UNIT[6], phys = 1 * WAGE_UNIT[6];
    const rich = payWages(order, 6, 1);
    expect(rich.leave).toEqual([]);
    expect(rich.paid).toBeCloseTo(kit + phys, 5);
    const poor = payWages(order, 6, kit + phys / 2);
    expect(poor.leave).toEqual(['physio']);
    expect(poor.budget).toBeGreaterThanOrEqual(0);
    expect(payWages(order, 6, 0).budget).toBe(0);
    expect(wageBill(order, 6)).toBeCloseTo(kit + phys, 5);
  });
  it('staff on leave have no effect until a later season end can pay them', () => {
    const a = activeEffects({ researched: ['p-physio'], leave: ['physio'], projectsDone: [], boons: [] });
    expect(ruleValue(a, 'knock-days', 0)).toBe(0);
  });
  it('the club doctor levels on medicine days and shortens knocks; it never touches a rating', () => {
    expect([0, 13, 14, 42, 90, 180].map(doctorLevel)).toEqual([0, 0, 1, 2, 3, 4]);
    const doc = STAFF.find((s) => s.id === 'club-doctor')!;
    expect(doc.effects.some((e) => e.kind === 'axis')).toBe(false);
    const none = activeEffects({ researched: [], leave: [], projectsDone: [], boons: [] });
    expect(healDays(none, 42, true)).toBe(2);
    expect(healDays(none, 42, false)).toBe(0);
  });
  it('healing softens an injury, then a knock', () => {
    const meds = [1, 2, 3].map((i) => ({ date: addDays(D0, -i), allTaken: false }));
    expect(physio(meds, D0, false).state).toBe('injury');
    expect(physio(meds, D0, false, 2).state).toBe('knock');
    expect(physio(meds, D0, false, 3).mods[0].d).toBe(-1);
    expect(physio(meds, D0, false, 0).mods).toEqual(physio(meds, D0, false).mods);
  });
});

describe('formations unlocking', () => {
  it('4-3-3 from the start; the tree opens 4-4-2, 4-2-3-1 and 3-5-2', () => {
    const f = (r: string[]) => formationsOpen(activeEffects({ researched: r, leave: [], projectsDone: [], boons: [] }));
    expect(f([])).toEqual(['4-3-3']);
    expect(f(['s-442', 'p-4231', 'r-352'])).toEqual(['4-3-3', '4-4-2', '4-2-3-1', '3-5-2']);
  });
});

describe('boons and bounties', () => {
  it('three picks a season on days 1, 15 and 29, plus extra picks from the track', () => {
    const u = user();
    expect(boonPickOpen(u, 1, 1, 0)).toBe(1);
    const one = { ...u, boons: [{ season: 1, pick: 1, id: BOONS[0].id }] };
    expect(boonPickOpen(one, 1, 14, 0)).toBeUndefined();
    expect(boonPickOpen(one, 1, 15, 0)).toBe(2);
    expect(boonPickOpen(one, 1, 14, 1)).toBe(4);
  });
  it('offers 1 of 3, never a boon already held this season; a new season resets', () => {
    const held = { ...user(), boons: [{ season: 2, pick: 1, id: 'fortress' }] };
    const offer = boonOffer(held, 2, 2);
    expect(offer).toHaveLength(BOON_CHOICES);
    expect(ids(offer)).not.toContain('fortress');
    expect(boonOffer(held, 2, 2)).toEqual(offer); // seeded
  });
  it('six bounties a week, progress counts that week only', () => {
    const week = weekStart(D0);
    const offer = bountyOffer(week);
    expect(offer).toHaveLength(6);
    expect(new Set(ids(offer)).size).toBe(6);
    const steps5 = BOUNTIES.find((b) => b.id === 'b-steps-5')!;
    const rows = [-1, 0, 1, 2].map((i) => ({ date: addDays(week, i), m: { steps: 1 } }));
    expect(bountyProgress(engine({ days: rows }), steps5, week, addDays(week, 6))).toBe(3);
  });
});

describe('the season track', () => {
  it('42 steps, a reward on each seventh step', () => {
    expect(TRACK).toHaveLength(42);
    for (const s of TRACK.filter((x) => x.step % 7 === 0)) expect(s.reward).not.toBeNull();
  });
  it('one step a logged day, plus catch-ups, capped at 42; rewards are paid once', () => {
    const e = engine({ track: { season: 3, steps: Array.from({ length: 6 }, (_, i) => addDays(D0, i)), catchups: 1 } });
    expect(trackSteps(e, 3)).toBe(7);
    expect(trackSteps(e, 4)).toBe(0);
    expect(trackDue(e, 3).map((s) => s.step)).toEqual([4, 7]);
    expect(trackDue({ ...e, trackPaid: ['3:4', '3:7'] }, 3)).toEqual([]);
    expect(trackSteps(engine({ track: { season: 1, steps: Array.from({ length: 50 }, (_, i) => addDays(D0, i)), catchups: 3 } }), 1)).toBe(42);
  });
});

describe('the board', () => {
  const facts = (p: Partial<SeasonFacts> = {}): SeasonFacts => ({ position: 8, divisionSize: 18, promoted: false, playoffs: false, goals: 50, cleanSheets: 10, derbyWins: 0, homeUnbeaten: 4, aboveRival: undefined, bigcup: ['Last 128', 'Last 64'], tiercup: [], inContinental: false, derbyOn: false, ...p });
  it('two objectives a season, set from strength, never a derby without the derby', () => {
    for (const s of ['low', 'mid', 'high'] as const) {
      const o = boardFor(1, s, { inContinental: false, derbyOn: false, divisionSize: 18, topTier: false });
      expect(o).toHaveLength(2);
      for (const x of o) { expect(x.for).toContain(s); expect(['derby', 'above-rival', 'continental']).not.toContain(x.goal.kind); }
    }
  });
  it('strength reads the squad against the division', () => {
    expect(strengthOf(90, [40, 50, 60, 70])).toBe('high');
    expect(strengthOf(10, [40, 50, 60, 70])).toBe('low');
  });
  it('verdicts read the season', () => {
    const top: BoardObjective = { id: 'x', text: '', for: ['mid'], met: '', missed: '', goal: { kind: 'position', atBest: 9 } };
    expect(objectiveMet(top, facts({ position: 8 }))).toBe(true);
    expect(objectiveMet(top, facts({ position: 10 }))).toBe(false);
    const r3: BoardObjective = { ...top, goal: { kind: 'cup-round', cup: 'bigcup', round: 'r3' } };
    expect(objectiveMet(r3, facts())).toBe(false);
    expect(objectiveMet(r3, facts({ bigcup: ['Last 128', 'Last 64', 'Last 32', 'Last 16'] }))).toBe(true);
  });
});

describe('packs, the album, duplicates and running low', () => {
  const pack = (id: string, size: 'normal' | 'big' | 'single' = 'normal') => ({ id, size });
  it('five items a pack, mostly album cards; never a player; seeded', () => {
    const items = openPack(pack('p1'), user());
    expect(items).toHaveLength(5);
    expect(items.filter((i) => i.kind === 'album').length).toBeGreaterThanOrEqual(3);
    expect(openPack(pack('p1'), user())).toEqual(items);
    expect(openPack(pack('big1', 'big'), user())).toHaveLength(8);
    expect(openPack(pack('one', 'single'), user())).toHaveLength(1);
  });
  it('the loan slot shows nothing yet (layer 4): no pack ever holds a loan', () => {
    for (let k = 0; k < 300; k++) expect(openPack(pack(`l${k}`), user()).some((i) => i.kind === 'loan')).toBe(false);
  });
  it('a duplicate becomes research by rarity: Bronze 1 up to Icon 10, Legend 15', () => {
    expect(DUPLICATE_RESEARCH).toEqual({ bronze: 1, silver: 2, gold: 4, prism: 6, icon: 10, legend: 15 });
    const card = ALBUM_CARDS[0];
    const had: TreeUser = { ...user(), opened: [{ id: 'old', on: D0, items: ALBUM_CARDS.map((c) => ({ kind: 'album' as const, id: c.id, rarity: c.rarity })) }] };
    const items = openPack(pack('dup'), had).filter((i) => i.kind === 'album');
    for (const i of items) { expect(i.duplicate).toBe(true); expect(i.n).toBe(DUPLICATE_RESEARCH[i.rarity!]); }
    expect(bank(engine(), { ...had, opened: [...had.opened, { id: 'dup', on: D0, items }] })).toBe(items.reduce((t, i) => t + i.n!, 0));
    void card;
  });
  it('a finished set shows as done', () => {
    const set = albumProgress(user())[0].set;
    const u: TreeUser = { ...user(), opened: [{ id: 'x', on: D0, items: set.cards.map((c) => ({ kind: 'album' as const, id: c.id, rarity: c.rarity })) }] };
    expect(albumProgress(u)[0].done).toBe(true);
    expect(collected(u).size).toBe(set.cards.length);
  });
  it('running low: once at 80–85% collected, not again until the pool grows', () => {
    const n = Math.ceil(ALBUM_CARDS.length * 0.8);
    const u: TreeUser = { ...user(), opened: [{ id: 'x', on: D0, items: ALBUM_CARDS.slice(0, n).map((c) => ({ kind: 'album' as const, id: c.id, rarity: c.rarity })) }] };
    const below: TreeUser = { ...u, opened: [{ ...u.opened[0], items: u.opened[0].items.slice(0, n - 2) }] };
    expect(runningLowNow(below, [])).not.toContain('album');
    expect(runningLowNow(u, [])).toContain('album');
    const pct = poolCounts(u, []).album.collected / ALBUM_CARDS.length;
    expect(pct).toBeGreaterThanOrEqual(0.8);
    expect(pct).toBeLessThanOrEqual(0.85);
    expect(runningLowNow({ ...u, lowShown: { album: ALBUM_CARDS.length } }, [])).not.toContain('album');
  });
});

describe('the day, end to end', () => {
  const season = { id: 1, tierOf: { bra: 6, x1: 6, x2: 6, ant: 5 }, tiercups: {}, playoffs: {}, bigcup: { id: 'b', name: 'B', size: 2, rounds: [] } } as unknown as FbSeason;
  const ctx = (h: Health, save: Partial<FbSave>): TreeCtx => ({
    h, save: { id: 'save', season: 1, phase: 'season', day: 1, budget: 1, moved: false, ...save } as FbSave, season, bundles: new Map(), news: [],
    matches: () => [], clubs: new Map([['bra', { id: 'bra', tier: 6, rating: 50 }]]),
  });
  it('a logged day earns research, moves the track, counts habits and sets the board', () => {
    const h = health({ days: days([{ date: D0, steps: 9000 }]) });
    const c = ctx(h, {});
    treeDay(c, D0, 0);
    const e = c.save.tree!;
    expect(e.earned).toBe(1);
    expect(e.track.steps).toEqual([D0]);
    expect(e.days[0].m).toMatchObject({ logged: 1, steps: 1 });
    expect(e.board[0].ids).toHaveLength(2);
    // An empty day earns nothing and moves nothing.
    const c2 = ctx(health(), {});
    treeDay(c2, D0, 0);
    expect(c2.save.tree!.earned).toBe(0);
    expect(c2.save.tree!.track.steps).toEqual([]);
  });
  it('a sick day is no data: it counts as logged, nothing else', () => {
    const h = health({ days: days([{ date: D0, steps: 20000, status: 'sick' }]), sessions: [sess('s', D0)] });
    expect(dayMetrics(h, D0)).toEqual({ logged: 1 });
  });
  it('nothing rewards eating less: under the calorie range never counts for kcal', () => {
    const h = health({ kcal: new Map([[D0, { kcal: 1200, protein: 150, n: 3 }]]) });
    expect(dayMetrics(h, D0).kcal).toBeUndefined();
    const h2 = health({ kcal: new Map([[D0, { kcal: 2100, protein: 150, n: 3 }]]) });
    expect(dayMetrics(h2, D0).kcal).toBe(1);
  });
  it('a target tech completes on the day the bank covers it', () => {
    const h = health({ days: days(Array.from({ length: 3 }, (_, i) => ({ date: addDays(D0, i), steps: 100 }))) });
    const c = ctx(h, { tree: engine({ earned: 18 }), treeUser: user([], { target: 's-442' }) });
    treeDay(c, D0, 0);
    expect(c.save.treeUser!.researched.map((r) => r.id)).toEqual([]);
    treeDay(c, addDays(D0, 1), 0);
    expect(c.save.treeUser!.researched.map((r) => r.id)).toEqual(['s-442']);
  });
  it('a bounty done pays once', () => {
    const week = weekStart(D0);
    const b = bountyOffer(week).find((x) => x.target.what === 'logged' || x.target.what === 'steps') ?? bountyOffer(week)[0];
    const h = health({ days: days(Array.from({ length: 7 }, (_, i) => ({ date: addDays(week, i), steps: 9000, foodDone: true }))) });
    const c = ctx(h, { treeUser: user([], { bounties: [{ week, ids: [b.id] }] }) });
    for (let i = 0; i < 7; i++) treeDay(c, addDays(week, i), 0);
    const done = c.save.tree!.bountiesDone.filter((k) => k === `${week}:${b.id}`);
    if (['logged', 'steps', 'closed'].includes(b.target.what)) expect(done).toHaveLength(1);
    expect(done.length).toBeLessThanOrEqual(1);
  });
  it('lesson points after a match, and a pack for a final won', () => {
    const c = ctx(health(), {});
    treeMatch(c, { result: 'L', date: D0, round: 'Matchday 3' } as StoredMatch);
    expect(c.save.tree!.earned).toBe(3);
    treeMatch(c, { result: 'W', date: D0, round: 'The Big Cup, Final' } as StoredMatch);
    expect(c.save.tree!.packs.map((p) => p.source)).toEqual(['final-won']);
  });
  it('season end: wages paid from the budget, the unpaid go on leave, no debt', () => {
    const order = ['s-kitsponsor', 's-kitman', 's-442', 's-fiveaside', 'p-physio'];
    const c = ctx(health(), { budget: 0.03, treeUser: user(order), tree: engine({ board: [{ season: 1, strength: 'mid', ids: ['o-top-half'] }] }) });
    treeSeasonEnd(c, D0, { 6: [{ id: 'bra', p: 34, w: 20, d: 5, l: 9, gf: 60, ga: 30, pts: 65, form: [] }] } as never, false, { gate: 0, tv: 0, sponsors: 0, shop: 0, continental: 0 });
    expect(c.save.budget).toBeGreaterThanOrEqual(0);
    expect(c.save.tree!.leave).toEqual(['physio']);
    expect(c.save.tree!.earned).toBe(10); // top half met
    expect(c.news.some((n) => n.text.startsWith('From the chairman'))).toBe(true);
  });
});

describe('situational bonuses in the match', () => {
  const v = (n: number) => Object.fromEntries(AXES.map((a) => [a, n])) as AxisValues;
  const opp = opponentFor(clubById('ant'), { rating: 50 });
  it('tree bonuses fire only in their situation and stay under ±3 per axis', () => {
    const save = { season: 1, treeUser: user([], { boons: [{ season: 1, pick: 1, id: 'flying-start' }, { season: 1, pick: 2, id: 'second-wind-boon' }] }) } as unknown as FbSave;
    const t = treeAbilities({ save, bundles: new Map() }, {}, true);
    expect(t.abilities.map((a) => a.when).sort()).toEqual(['first-half', 'second-half']);
    const ev = playMatch({ seed: 7, values: v(12), opp, home: true, stack: 0, abilities: [...t.abilities, ...t.abilities, ...t.abilities], bench: [], pre: [], conds: [] });
    for (const c of ev.chances) {
      const sums: Record<string, number> = {};
      for (const m of c.mods.filter((x) => x.kind === 'ability')) sums[m.axis] = (sums[m.axis] ?? 0) + m.d;
      for (const s of Object.values(sums)) expect(s).toBeLessThanOrEqual(3);
      const fs = c.mods.filter((x) => x.why === 'Flying start');
      if (c.minute > 45) expect(fs).toHaveLength(0);
    }
  });
  it('a waiting derby boost waits for a derby, then is used once', () => {
    const save = { season: 1, treeUser: user([], { opened: [{ id: 'p', on: D0, items: [{ kind: 'boost', id: 'bo-derby-head' }] }] }) } as unknown as FbSave;
    expect(treeAbilities({ save, bundles: new Map() }, {}, true).boosts).toEqual([]);
    expect(treeAbilities({ save, bundles: new Map() }, { derby: true }, true).boosts).toEqual(['bo-derby-head']);
    expect(treeAbilities({ save, bundles: new Map() }, { derby: true }, true).boosts).toEqual([]);
  });
});

describe('the tree wired into the rotation (layers 2 and 3 together)', () => {
  const act = (researched: string[], extra: { leave?: string[]; boons?: string[] } = {}) =>
    activeEffects({ researched, leave: extra.leave ?? [], projectsDone: [], boons: extra.boons ?? [], boosts: [] });

  it('nothing researched: layer 2 base numbers, only 4-3-3, no unit captains', () => {
    const r = treeRotation(act([]));
    expect(r.rules).toEqual(BASE_RULES);
    expect(r.formations).toEqual(['4-3-3']);
    expect(r.captains).toBe(false);
  });
  it('Unit captains turns captains on', () => {
    expect(treeRotation(act(['s-captains'])).captains).toBe(true);
  });
  it('the Top flight 4-3-3 tech opens the attacking 4-3-3: Power +1, Fuel −1 against plain 4-3-3', () => {
    const r = treeRotation(act(['t-433']));
    expect(r.formations).toContain('4-3-3 attack');
    const n = nudgesFor({ formation: '4-3-3 attack', rules: r.rules });
    expect(n).toEqual(expect.arrayContaining([{ axis: 'Power', d: 1, why: 'an extra place' }, { axis: 'Fuel', d: -1, why: 'one place fewer' }]));
  });
  it('a formation the tree has not opened falls back to 4-3-3', () => {
    const r = treeRotation(act([]));
    expect(formationFor({ formation: '4-4-2' }, r)).toBe('4-3-3');
    expect(formationFor({ formation: '4-4-2' }, treeRotation(act(['s-442'])))).toBe('4-4-2');
    expect(sheetFor({ formation: '3-5-2' }, r)?.formation).toBe('4-3-3');
  });
  it('techs, staff and boons change the rotation rules; the best value wins whatever the order', () => {
    const r = treeRotation(act(['s-fiveaside', 'r-sportsscience', 't-rotation', 't-band', 'p-meals', 't-pool'], { boons: ['tight-knit'] }));
    expect(r.rules.chemistryDays).toBe(5);
    expect(r.rules.freshnessFloor).toBe(70);
    expect(r.rules.chemistryChanges).toBe(3);
    expect(r.rules.moraleCaptainUp).toBe(true);
    expect(r.rules.fuelBreakDays).toBe(22);
    expect(r.rules.freshnessReturn).toBe(30);
    expect(r.rules.freshnessCost).toBe(10);
  });
  it('staff on leave stop changing the rules', () => {
    const r = treeRotation(act(['p-meals'], { leave: ['nutritionist'] }));
    expect(r.rules.fuelBreakDays).toBe(BASE_RULES.fuelBreakDays);
  });
  it('the cheaper chemistry from the rules reaches chemistryAfter', () => {
    const xi = [{ unit: 'Pace' as const, player: 'a', rating: 60 }, { unit: 'Pace' as const, player: 'b', rating: 60 }];
    const rules = treeRotation(act(['s-fiveaside'])).rules;
    let chem = {};
    for (let i = 0; i < 5; i++) chem = chemistryAfter(chem, xi as never, rules);
    expect((chem as Record<string, { level: number }>).Pace.level).toBe(1);
    let base = {};
    for (let i = 0; i < 5; i++) base = chemistryAfter(base, xi as never, BASE_RULES);
    expect((base as Record<string, { level?: number }>).Pace?.level ?? 0).toBe(0);
  });
});
