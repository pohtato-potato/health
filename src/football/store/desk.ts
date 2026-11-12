// The manager's desk (desk spec §2–3, §8, §13), read and written. Taps write only `save.desk` (a user key in
// play.ts) and the owner's own questions (`deskQuestions`, on the phone only). Everything that changes the world is
// folded in when the day plays at 4 am (`desk/fold.ts`, called from play.ts).
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { addDays, type DayKey } from '../../domain/dates';
import { BUNDLES, isOpen as bundleOpen } from '../ground';
import { PROJECTS } from '../content/projects';
import { clubById } from '../data/load';
import { diceFor, FORM_DAYS } from '../desk/dice';
import { COURSE_SIZE, grade, importQuestions, lifelineStrikes, type ImportResult } from '../desk/course';
import type { ColumnLine, Question } from '../desk/content';
import { jobById, JOBS } from '../desk/jobs';
import { clockFilled, diceLeft, spendsOn } from '../desk/rules';
import { spendDie, spendSeed, type SpendError } from '../desk/spend';
import { emptyDesk, type CourseDraft, type CourseResult, type DeskState, type DeskView, type Die, type JobId } from '../desk/types';
import { DESK_COLUMN, DESK_FAN_MAIL, DESK_QUESTIONS, fillLine, type LineNames } from '../desk/words';
import { hashSeed, rng, shuffle } from '../rng';
import { projectOpen } from '../tree/projects';
import { AXES, type Axis } from '../types';
import { loadHealth, nightFor, type Health } from './gather';
import { scoutLevel } from './paused';
import { OWN } from './season';
import { researchedOf } from './tree';
import type { FbSave } from './tables';
import type { Tonight } from './hooks';
import { fixtureFor } from './tonight';

export const deskOf = (s: Pick<FbSave, 'desk'> | undefined | null): DeskState => ({ ...emptyDesk(), ...s?.desk });

/** The dice for a logging day: made from the day before it. */
export function diceOn(h: Health, date: DayKey): Die[] {
  const y = addDays(date, -1);
  const night = nightFor(h, y);
  const history: Partial<Record<Axis, number[]>> = {};
  for (let i = 1; i <= FORM_DAYS; i++) {
    const d = addDays(y, -i);
    if (!h.days.has(d)) continue;
    const n = nightFor(h, d);
    if (h.days.get(d)?.status === 'sick') continue;
    for (const a of AXES) if (!n.flags[a]) (history[a] ??= []).push(n.values[a]);
  }
  return diceFor({ values: night.values, flags: night.flags, input: night.input, status: h.days.get(y)?.status, history });
}

/** The dice a day hands over: frozen in the save once seen, so a later edit to yesterday never reshuffles them. */
export const diceFrozen = (save: FbSave, h: Health, date: DayKey): Die[] => save.desk?.dice[date] ?? diceOn(h, date);

/** Each need in plain words, for the project row. */
const NEED: Record<string, string> = { steps: 'step days', training: 'sessions', sleep: 'nights slept', protein: 'protein days', kcal: 'calorie days', bedtime: 'bedtimes kept', meds: 'medicine days', youth: 'academy sessions', logged: 'days logged', closed: 'days closed' };

/** The club's name, for column lines that say it. */
const CLUB = 'Brabo United';

/**
 * The column offered today: two lines and one fan-mail reply, seeded by the day, never one already run. After a loss
 * the first line is a calm one about it; `after-loss` lines wait for a loss. A line naming a rival or one of ours
 * waits for a day that has one.
 */
function columnOffer(desk: DeskState, date: DayKey, names: LineNames, lost: boolean): DeskView['columnLines'] {
  const used = new Set(desk.spends.flatMap((s) => s.effects).flatMap((e) => (e.kind === 'column' ? [e.line] : [])));
  const r = rng(hashSeed('desk-column', date));
  const ready = (ls: ColumnLine[]) => {
    const all = ls.flatMap((l) => { const text = fillLine(l.text, names); return text ? [{ ...l, text }] : []; });
    const fresh = all.filter((l) => !used.has(l.id));
    return shuffle(r, fresh.length ? fresh : all);
  };
  const calm = lost ? ready(DESK_COLUMN.filter((l) => l.kind === 'after-loss')).slice(0, 1) : [];
  const lines = [...calm, ...ready(DESK_COLUMN.filter((l) => l.kind !== 'after-loss'))].slice(0, 2);
  const fan = ready(DESK_FAN_MAIL).slice(0, 1);
  return [...lines, ...fan].map((l) => ({ id: l.id, text: l.text, ...(l.to ? { to: l.to, letter: l.letter } : {}) }));
}

/** Every question in the course pool: the bank and the owner's own. */
export async function questionPool(): Promise<Question[]> {
  return [...DESK_QUESTIONS, ...(await db.deskQuestions.toArray())];
}

/** What every job sees today. */
export async function deskView(t: Pick<Tonight, 'save' | 'date' | 'fixture'>): Promise<DeskView> {
  const { save, date } = t;
  const desk = deskOf(save);
  const opp = t.fixture?.opp && t.fixture.comp !== 'worldcup' && t.fixture.comp !== 'event' ? clubById(t.fixture.opp) : undefined;
  const squad = await db.fbSquad.toArray();
  const bundles = await db.fbBundles.toArray();
  const season = await db.fbSeasons.get(save.season);
  const states = new Map(bundles.map((b) => [b.id, b]));
  const built = bundles.filter((b) => b.done).map((b) => b.id);
  const gates = { tier: season?.tierOf[OWN] ?? 6, moved: Boolean(save.moved), done: built, researched: researchedOf(save), budget: save.budget };
  const projects = PROJECTS.filter((p) => (p.source === 'ground' ? bundleOpen(BUNDLES.find((b) => b.id === p.id)!, gates) : projectOpen(p, gates)) && p.needs.length)
    .map((p) => {
      const prog = states.get(p.id)?.progress ?? {};
      const open = p.needs.filter((n) => (prog[n.what] ?? 0) < n.count);
      const w = (open.length ? open : p.needs).reduce((b, n) => ((prog[n.what] ?? 0) / n.count < (prog[b.what] ?? 0) / b.count ? n : b));
      return { id: p.id, name: p.name, worst: { what: NEED[w.what] ?? w.what, have: Math.min(w.count, prog[w.what] ?? 0) + pendingPush(desk, p.id, save.lastPlayed), count: w.count } };
    })
    .map((p) => ({ ...p, worst: { ...p.worst, have: Math.min(p.worst.count, p.worst.have) } }));
  const today = spendsOn(desk, date);
  const spentToday: DeskView['spentToday'] = {};
  for (const s of today) spentToday[s.job] = (spentToday[s.job] ?? 0) + 1;
  const rival = save.rivals.find((x) => x.clubId !== opp?.id);
  const ours = squad.filter((y) => y.status === 'growing' || y.status === 'promoted');
  const names: LineNames = {
    club: CLUB,
    opp: opp?.name ?? (rival ? clubById(rival.clubId).name : undefined),
    player: ours.length ? ours[Math.floor(rng(hashSeed('desk-player', date))() * ours.length)].name : undefined,
  };
  const last = await db.fbMatches.where('date').below(date).last();
  const pool = await questionPool();
  return {
    date,
    opp: opp ? { id: opp.id, name: opp.name, style: opp.style } : undefined,
    oppKnown: opp ? scoutLevel(save, opp.id) : 'none',
    youth: squad.filter((y) => y.status === 'growing').map((y) => ({ id: y.id, name: y.name, axis: y.axis, growth: Math.round(((y.growth ?? 0) + pendingGrow(desk, y.id, save.lastPlayed)) * 100) / 100, potential: y.potential })),
    projects,
    columnLines: columnOffer(desk, date, names, last?.result === 'L'),
    questions: pool.map((q) => q.id),
    answered: desk.courses.flatMap((c) => courseIds(desk, c.spend)),
    spentToday,
    clocks: desk.clocks.map((c) => ({ ...c, filled: clockFilled(desk, c) })),
  };
}

/** Pushes and growth spent today and not yet folded (they land when the day plays): shown at once on the desk. */
const pending = (desk: DeskState, played?: DayKey) => desk.spends.filter((s) => played === undefined || s.day > played);
function pendingPush(desk: DeskState, id: string, played?: DayKey) {
  return pending(desk, played).flatMap((s) => s.effects).reduce((t, e) => t + (e.kind === 'project' && e.id === id ? e.n : 0), 0);
}
function pendingGrow(desk: DeskState, id: string, played?: DayKey) {
  return pending(desk, played).flatMap((s) => s.effects).reduce((t, e) => t + (e.kind === 'grow' && e.youth === id ? e.n : 0), 0);
}
const courseIds = (desk: DeskState, spend: string) => desk.spends.find((s) => s.id === spend)?.effects.flatMap((e) => (e.kind === 'course' ? e.ids : [])) ?? [];

export interface DeskModel {
  date: DayKey;
  view: DeskView;
  desk: DeskState;
  /** Today's dice, and those still in the tray. */
  dice: Die[];
  left: Die[];
  /** Closed for the day: Close the day has run (the dice became research) or the day has played. */
  shut: boolean;
  /** A course spent today and not finished yet. */
  courseOpen?: string;
}

export async function loadDesk(t: Pick<Tonight, 'save' | 'date' | 'fixture'>): Promise<DeskModel> {
  const h = await loadHealth();
  const desk = deskOf(t.save);
  const dice = diceFrozen(t.save, h, t.date);
  const view = await deskView(t);
  const shut = Boolean(h.days.get(t.date)?.seal) || (t.save.lastPlayed !== undefined && t.save.lastPlayed >= t.date);
  const open = spendsOn(desk, t.date).find((s) => s.job === 'course' && !desk.courses.some((c) => c.spend === s.id));
  return { date: t.date, view, desk, dice, left: diceLeft(dice, spendsOn(desk, t.date)), shut, courseOpen: open?.id };
}

/** Freezes the day's dice in the save the first time they are seen (the parcel tile or the desk). */
export async function freezeDice(date: DayKey, dice: Die[]): Promise<void> {
  await db.transaction('rw', db.fbSave, async () => {
    const s = await db.fbSave.get('save');
    if (!s || s.desk?.dice[date]) return;
    const d = deskOf(s);
    // Only the last fortnight of dice is kept; spends stay for good (they are the record of what the desk did).
    const keep = Object.fromEntries(Object.entries(d.dice).filter(([k]) => k >= addDays(date, -14)));
    await db.fbSave.put({ ...s, desk: { ...d, dice: { ...keep, [date]: dice } } });
  });
}

/** Spends a die on a job. Refused once the day is closed or played. */
export async function spendAt(date: DayKey, die: Die, job: JobId, target?: string): Promise<SpendError | 'shut' | undefined> {
  const save = await db.fbSave.get('save');
  if (!save) return 'no-job';
  const day = await db.days.get(date);
  if (day?.seal || (save.lastPlayed !== undefined && save.lastPlayed >= date)) return 'shut';
  const h = await loadHealth();
  const dice = diceFrozen(save, h, date);
  const desk = { ...deskOf(save), dice: { ...deskOf(save).dice, [date]: dice } };
  const season = await db.fbSeasons.get(save.season);
  const view = await deskView({ save, date, fixture: season ? fixtureFor(save, season) : undefined });
  const r = spendDie(desk, view, die, job, target);
  if ('error' in r) return r.error;
  return db.transaction('rw', db.fbSave, async () => {
    const s = await db.fbSave.get('save');
    if (!s) return 'no-job' as const;
    const cur = deskOf(s);
    if (cur.spends.some((x) => x.id === r.spend.id)) return 'no-die' as const;
    await db.fbSave.put({ ...s, desk: { ...cur, dice: { ...cur.dice, [date]: dice }, spends: [...cur.spends, r.spend], clocks: r.desk.clocks } });
    return undefined;
  });
}

// ---------- the coaching course ----------
export interface CourseSheet { spend: string; questions: Question[]; lifeline: boolean; strikes: Record<string, string[]>; done?: CourseResult; draft?: CourseDraft }

/** The five questions of a course spent at the desk, and the lifeline's strikes (seeded, so always the same two). */
export async function courseSheet(desk: DeskState, spendId: string): Promise<CourseSheet | undefined> {
  const s = desk.spends.find((x) => x.id === spendId);
  const e = s?.effects.find((x) => x.kind === 'course');
  if (!s || !e || e.kind !== 'course') return undefined;
  const pool = new Map((await questionPool()).map((q) => [q.id, q]));
  const questions = e.ids.map((id) => pool.get(id)).filter((q): q is Question => !!q).slice(0, COURSE_SIZE);
  const strikes: Record<string, string[]> = {};
  if (e.lifeline) for (const q of questions) strikes[q.id] = lifelineStrikes(q, rng(hashSeed('lifeline', spendId, q.id)));
  return { spend: spendId, questions, lifeline: e.lifeline, strikes, done: desk.courses.find((c) => c.spend === spendId), draft: desk.drafts?.[spendId] };
}

/** Hands in a course once: 3 right is a pass, and a pass levels up the manager's eye. */
export async function finishCourse(spendId: string, answers: (string | null)[], date: DayKey): Promise<CourseResult | undefined> {
  const save = await db.fbSave.get('save');
  const sheet = save && (await courseSheet(deskOf(save), spendId));
  if (!sheet) return undefined;
  if (sheet.done) return sheet.done;
  const g = grade(sheet.questions, answers);
  const res: CourseResult = { spend: spendId, on: date, answers, right: g.right, passed: g.passed };
  await db.transaction('rw', db.fbSave, async () => {
    const s = await db.fbSave.get('save');
    if (!s) return;
    const d = deskOf(s);
    if (d.courses.some((c) => c.spend === spendId)) return;
    const drafts = { ...d.drafts };
    delete drafts[spendId];
    await db.fbSave.put({ ...s, desk: { ...d, courses: [...d.courses, res], drafts } });
  });
  return res;
}

/** Keeps a course's answers and a used lifeline when you leave it halfway. The lifeline, once used, stays used. */
export async function saveDraft(spendId: string, draft: CourseDraft): Promise<void> {
  await db.transaction('rw', db.fbSave, async () => {
    const s = await db.fbSave.get('save');
    if (!s) return;
    const d = deskOf(s);
    if (d.courses.some((c) => c.spend === spendId)) return;
    const helped = d.drafts?.[spendId]?.helped ?? draft.helped;
    await db.fbSave.put({ ...s, desk: { ...d, drafts: { ...d.drafts, [spendId]: { answers: draft.answers, ...(helped ? { helped } : {}) } } } });
  });
}

// ---------- the owner's own questions (on the phone only) ----------
export async function importMine(text: string, name: string): Promise<ImportResult & { added: number }> {
  const r = importQuestions(text, name);
  const have = new Set((await db.deskQuestions.toArray()).map((q) => q.id));
  const fresh = r.questions.filter((q) => !have.has(q.id));
  if (fresh.length) await db.deskQuestions.bulkPut(fresh);
  return { ...r, added: fresh.length };
}
export const clearMine = () => db.deskQuestions.clear();
export const useMineCount = () => useLiveQuery(() => db.deskQuestions.count(), []);

export const jobsForDesk = (v: DeskView) => JOBS.filter((j) => j.open(v));
export { jobById, spendSeed };
