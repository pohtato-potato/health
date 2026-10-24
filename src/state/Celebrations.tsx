import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef } from 'react';
import { addDays, dayRange, daysBetween, weekStart, type DayKey } from '../domain/dates';
import { fmt1, fmtDayMonth, fmtInt, weekdayName } from '../domain/format';
import { CHAPTERS, arrivals, chapterAt, kmFromSteps } from '../domain/walk';
import { arrivalToPlay, canPlayArrivalAt, stateLineToPlay } from '../walk/arrivals';
import { routeById } from '../walk/catalogue';
import { planWalkMoments, type MomentCandidate } from '../walk/moments';
import { routeKm } from '../walk/runs';
import { bump } from '../db/actions';
import { db } from '../db/db';
import { useAllDays, useAllSets, useEntriesBetween, useMeasurements, useSessions, useSettings, useToday } from '../db/hooks';
import { goldenMoments } from '../domain/golden';
import { useMoments, type MomentData } from '../ui/Moments';
import { useToast } from '../ui/Toasts';
import { go } from '../router';
import { checklistSlots, dayRings, stepStreakFor, targetsFor, weeksFor } from './derived';
import { DEFAULT_MED_REWARDS, keptWeek } from '../domain/medicines';

export const STEP_MILESTONES = [7, 14, 21, 30, 50, 75, 100, 150, 200, 250, 300, 365];
export const WEEK_MILESTONES = [2, 4, 8, 12, 16, 20, 26, 39, 52];
export const KM_MILESTONES = [100, 250, 500, 750, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 6000, 7500, 10000, 12500, 15000, 20000];

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** 7 → "Seven", 52 → "Fifty-two", 365 → "365". */
export function inWords(n: number, capital = true): string {
  let w: string;
  if (n <= 20) w = WORDS[n];
  else if (n < 100) w = TENS[Math.floor(n / 10)] + (n % 10 ? `-${WORDS[n % 10]}` : '');
  else if (n % 100 === 0 && n <= 1000) w = n === 1000 ? 'one thousand' : `${WORDS[n / 100]} hundred`;
  else w = fmtInt(n);
  return capital ? w.charAt(0).toUpperCase() + w.slice(1) : w;
}

export function ordinal(n: number): string {
  const words = ['zeroth', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'];
  if (n < words.length) return words[n];
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

/**
 * Watches the numbers and queues a celebration the moment one is earned:
 * a perfect day, a streak milestone, a waist or distance milestone, a new city.
 * Only things reached today or yesterday are celebrated, so installing the app
 * on top of old data doesn't set off a flood.
 */
export function CelebrationWatcher() {
  const { show } = useMoments();
  const toast = useToast();
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  const ws = weekStart(today);
  // From the Sunday before, so yesterday is covered on a Monday.
  const week = useEntriesBetween(addDays(ws, -1), addDays(ws, 6));
  const sessions = useSessions();
  const sets = useAllSets();
  const measurements = useMeasurements();
  const seen = useLiveQuery(async () => new Set((await db.seen.toArray()).map((x) => x.id)), []);
  const runs = useLiveQuery(() => db.routes.toArray(), []);
  const queued = useRef(new Set<string>());

  useEffect(() => {
    if (!settings?.setupDone || !days || !week || !sessions || !sets || !measurements || !seen || !runs) return;
    const fresh = (key: string) => !seen.has(key) && !queued.current.has(key);
    const push = (m: MomentData) => {
      if (!fresh(m.key)) return;
      queued.current.add(m.key);
      show(m);
    };
    const yesterday = addDays(today, -1);

    // A perfect day, today.
    const dayOf = (d: DayKey) => days.find((x) => x.date === d);
    const ringsOn = (d: DayKey) => dayRings(settings, d, dayOf(d), week.filter((e) => e.date === d));
    const { totals, rings } = ringsOn(today);
    if (rings.perfect) {
      const nth = dayRange(ws, today).filter((d) => ringsOn(d).rings.perfect).length;
      push({
        kind: 'perfect',
        key: `perfect:${today}`,
        kcal: totals.kcal,
        protein: totals.protein,
        steps: totals.steps,
        sub: nth > 1 ? `All three rings closed, your ${ordinal(nth)} this week.` : 'All three rings closed.',
      });
    }

    // Step streak milestones, dated to the day they were reached.
    const streak = stepStreakFor(settings, days, today);
    const target = targetsFor(settings, today).steps;
    if (STEP_MILESTONES.includes(streak.current)) {
      const reached = (dayOf(today)?.steps ?? 0) >= target ? today : yesterday;
      const n = streak.current;
      const next = STEP_MILESTONES.find((m) => m > n);
      const since = addDays(reached, -(n - 1));
      push({
        kind: 'streak',
        key: `streak:steps:${n}:${reached}`,
        count: n,
        unit: 'days',
        segments: Math.min(n, 7),
        kicker: `Step streak · ${weekdayName(reached).slice(0, 3)} ${fmtDayMonth(reached)}`,
        title: `${inWords(n)} days in a row.`,
        text: `${fmtInt(target)} steps or more every day since ${fmtDayMonth(since)}${streak.shieldsUsed.length ? ', with a shield or two along the way' : ''}.`,
        next: next ? `Next: ${next} days, around ${fmtDayMonth(addDays(reached, next - n))}` : undefined,
      });
    }

    // Training-week streaks, dated to the week they were reached.
    const weeks = weeksFor(settings, sessions, today, days);
    if (WEEK_MILESTONES.includes(weeks.streak)) {
      const reachedWeek = weeks.thisWeek >= weeks.perWeek ? ws : addDays(ws, -7);
      const n = weeks.streak;
      const next = WEEK_MILESTONES.find((m) => m > n);
      const since = addDays(reachedWeek, -7 * (n - 1));
      push({
        kind: 'streak',
        key: `streak:weeks:${n}:${reachedWeek}`,
        count: n,
        unit: 'weeks',
        segments: Math.min(n, 12),
        kicker: 'Training streak',
        title: `${inWords(n)} weeks of ${inWords(weeks.perWeek, false)}.`,
        text: `${inWords(weeks.perWeek)} sessions or more every week since ${fmtDayMonth(since)}, with the rest days kept too.`,
        next: next ? `Next: ${next} weeks, around ${fmtDayMonth(addDays(reachedWeek, 7 * (next - n) + 6))}` : undefined,
      });
    }

    // Waist milestones: each whole inch, and under half your height.
    const waists = measurements.filter((m) => m.waistStanding !== undefined);
    const latest = waists[waists.length - 1];
    const prev = waists[waists.length - 2];
    if (latest && prev && daysBetween(latest.date, today) <= 2) {
      const now = latest.waistStanding!;
      const before = prev.waistStanding!;
      const first = waists[0];
      const heightIn = settings.heightCm ? settings.heightCm / 2.54 : undefined;
      const stats = [
        { value: `−${fmt1(first.waistStanding! - now)} in`, label: `since ${fmtDayMonth(first.date)}` },
        ...(heightIn ? [{ value: (now / heightIn).toFixed(3), label: 'waist-to-height' }] : []),
      ];
      const spark = { points: waists.map((w) => w.waistStanding!), from: `${fmtDayMonth(first.date)} · ${first.waistStanding}`, to: `Now · ${now}` };
      if (heightIn && now < heightIn / 2 && before >= heightIn / 2) {
        push({ kind: 'milestone', key: 'waist:half-height', value: String(now), unit: 'in', title: 'Half your height.', text: 'Your waist is now under half your height, a widely used marker of good health.', spark, stats });
      } else {
        // The lowest whole inch crossed since the reading before.
        const inch = Math.ceil(now);
        if (before > inch) {
          push({
            kind: 'milestone',
            key: `waist:${inch}`,
            value: String(now),
            unit: 'in',
            title: now === inch ? `${inWords(inch)} inches.` : `Under ${inWords(inch, false)} inches.`,
            text: `Down from ${first.waistStanding} in on ${fmtDayMonth(first.date)}. The tape doesn't lie.`,
            spark,
            stats,
          });
        }
      }
    }

    // The walk: distance milestones and new cities.
    const steps = new Map(days.filter((d) => d.steps !== undefined).map((d) => [d.date, d.steps!]));
    const total = [...steps.values()].reduce((a, b) => a + b, 0);
    const km = kmFromSteps(total);
    const kmYesterday = kmFromSteps(total - (steps.get(today) ?? 0) - (steps.get(yesterday) ?? 0));
    for (const m of KM_MILESTONES) {
      if (km >= m && kmYesterday < m) {
        push({
          kind: 'milestone',
          key: `km:${m}`,
          value: fmtInt(m),
          unit: 'km',
          title: `${inWords(m)} kilometres.`,
          text: `Walked from Delhi, a lap of home at a time: ${fmtInt(total)} steps so far.`,
          stats: [
            { value: `${Math.round(((m - chapterAt(m).start) / (chapterAt(m).end - chapterAt(m).start)) * 100)}%`, label: `of chapter ${chapterAt(m).n}` },
            { value: String(new Set(arrivals(steps).filter((a) => a.km > 0).map((a) => a.name)).size), label: 'cities reached' },
          ],
          voice: 'postcard',
        });
      }
    }
    // A day's budget is one full-screen moment: a route finished, or else the farthest new city, or else a new
    // state line. The rest wait as a banner (walk-later ids). Other cities reached in the same save are stamped
    // quietly, and a chapter's end keeps its own moment. They take over the screen only on Today or the Walk tab with
    // no sheet open; anywhere else they wait, unmarked.
    if (canPlayArrivalAt(window.location.hash)) {
      const seenNow = new Set([...seen, ...queued.current]);
      const mark = (key: string) => {
        queued.current.add(key);
        void db.seen.put({ id: key, at: Date.now() });
      };
      const play = arrivalToPlay(steps, today, seenNow);
      play.quiet.forEach(mark);
      const line = stateLineToPlay(steps, today, seenNow);
      const candidates: MomentCandidate[] = [];
      for (const run of runs) {
        const def = routeById(run.id);
        if (def && (run.doneOn || routeKm(run, def, steps) >= def.km) && !seenNow.has(`walk-finish:${def.id}`)) candidates.push({ kind: 'finish', key: `walk-finish:${def.id}`, path: `/finish?id=${def.id}` });
      }
      if (play.city) {
        const a = arrivals(steps).find((x) => x.name === play.city!.name && x.chapter === play.city!.chapter)!;
        const ended = CHAPTERS.find((c) => c.end === a.km);
        candidates.push({ kind: 'arrival', key: play.city.key, path: `/arrive?c=${encodeURIComponent(a.name)}&ch=${a.chapter}${ended ? '&end=1' : ''}` });
        // A state line crossed in the same save is stamped quietly; the city's arrival shows the state.
        if (line.key) mark(line.key);
      } else if (line.state && line.key) candidates.push({ kind: 'state', key: line.key, path: `/arrive?s=${encodeURIComponent(line.state)}` });
      const plan = planWalkMoments(candidates, seenNow, today);
      plan.seen.forEach(mark);
      const [path, query = ''] = (plan.open ?? '').split('?');
      const q = new URLSearchParams(query);
      if (q.get('end')) {
        const a = arrivals(steps).find((x) => x.name === q.get('c') && x.chapter === Number(q.get('ch')))!;
        const ended = CHAPTERS.find((c) => c.end === a.km)!;
        const text = [
          'Delhi to the southern tip of India, on foot, at home. Chapter 1 is done.',
          'Round the Golden Quadrilateral and back to Chennai: Kolkata, Delhi and Mumbai along the way. Chapter 2 is done.',
          'Every state and every territory of India, the islands included. The whole map is yours.',
        ][ended.n - 1];
        if (ended.n === 2) void bump('quad-done');
        if (ended.n === 3) void bump('states-36');
        show({ kind: 'milestone', key: `chapter:${ended.n}`, value: fmtInt(a.km), unit: 'km', title: `${a.name}.`, text, voice: 'postcard' });
      } else if (path) go(path, Object.fromEntries(q));
    }

    // Reveal day: once, on the goal date or the first open after it.
    if (settings.goalDate && today >= settings.goalDate && today <= addDays(settings.goalDate, 7)) {
      push({ kind: 'golden', key: 'golden:reveal', kicker: 'Reveal day', place: fmtDayMonth(settings.goalDate), title: 'It’s here', text: 'Every line you sealed, your first and last photos, and the whole year played back. It’s all open now.', foot: 'Find it at the bottom of Journey.' });
    }

    // Golden moments: rare coincidences, yesterday's and today's.
    const slots = checklistSlots(settings);
    const reached = arrivals(steps);
    for (const d of [yesterday, today]) {
      const day = dayOf(d);
      const { rings, targets } = ringsOn(d);
      const records = [...new Set(sets.filter((x) => x.date === d && x.mark === '!!').map((x) => x.exercise))];
      for (const g of goldenMoments({
        date: d,
        day,
        rings,
        targets,
        slots: slots.length,
        ticked: slots.filter((s) => day?.ticks?.[s.key]).length,
        trained: sessions.some((s) => s.status === 'done' && s.date === d),
        records,
        city: reached.find((a) => a.date === d && a.km > 0)?.name,
        birthday: settings.birthday,
      })) {
        push({ kind: 'golden', ...g });
      }
    }

    // A kept week: every dose of last week on time, offered early in the new week.
    const lastWs = addDays(ws, -7);
    if ((settings.medRewards ?? DEFAULT_MED_REWARDS).keptWeek && today <= addDays(ws, 2) && keptWeek(settings.checklist, days, settings, lastWs)) {
      push({ kind: 'golden', key: `keptweek:${lastWs}`, kicker: 'A kept week', place: `Week of ${fmtDayMonth(lastWs)}`, title: 'Every dose on time', text: 'Seven days, and every dose within the hour. That is the quiet kind of discipline.' });
    }
  }, [settings, days, week, sessions, sets, measurements, seen, runs, today, ws, show, toast]);

  return null;
}
