import { useMemo, useState } from 'react';
import { TodayNight } from './TodayNight';
import { addDays, dayRange, weekStart, type DayKey } from '../domain/dates';
import { fmt1, fmtDayLong, fmtDuration, fmtInt, fmtLitres, fmtTime, weekdayName } from '../domain/format';
import { findSession } from '../domain/plan';
import { sleepMinutes, stepsGoal } from '../domain/rings';
import { MEAL_NAMES, MEALS, type Day, type FoodEntry, type Settings, type TrainingSession } from '../domain/types';
import { voiceLine, plainFlagLine, type Moment } from '../domain/voice';
import { bestFits, roomLeft } from '../domain/whatsleft';
import { addWater, bump } from '../db/actions';
import { useKonami } from '../ui/useKonami';
import { useActiveSession, useAllDays, useAllSets, useEntries, useEntriesBetween, useFoods, useMeasurements, useSessions, useSettings, useToday } from '../db/hooks';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Ticker, tickerContext } from '../ui/Ticker';
import { prefOn } from '../domain/types';
import { voiceFor } from '../domain/voice';
import { usageOf } from '../domain/foods';
import { go, openSheet } from '../router';
import { Icon } from '../ui/Icon';
import { Rings } from '../ui/Rings';
import { useToast } from '../ui/Toasts';
import {
  checklistSlots,
  dayRings,
  doneSessions,
  greeting,
  isNightTime,
  nextUp,
  recentFlag,
  stepStreakFor,
  swapSentence,
  targetsFor,
  weeksFor,
} from '../state/derived';
import { Banners } from './Banners';
import { ForecastCard } from './Readiness';
import { OccasionCard } from '../sheets/Occasion';
import { SeasonStrip, useUnlockedIds } from '../ui/Theme';
import { hasReward } from '../domain/rewards';
import { NextUpCard } from './NextUpCard';

export function Today() {
  const unlocked = useUnlockedIds();
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  const entries = useEntries(today);
  const sessions = useSessions();
  const sets = useAllSets();
  const active = useActiveSession();
  const foods = useFoods();
  const ws = weekStart(today);
  const weekEntries = useEntriesBetween(ws, addDays(ws, 6));
  const monthEntries = useEntriesBetween(addDays(today, -60), today);
  const toast = useToast();
  const measurements = useMeasurements();
  const unlockedCount = useLiveQuery(() => db.achievements.count(), []);
  const [showAll, setShowAll] = useState(false);
  const konami = useKonami(() => {
    void bump('konami');
    toast({ kicker: '↑ ↑ ↓ ↓ ← → ← →', text: 'Konami code accepted.', sub: 'Thirty lives not included. The Retro theme is yours.', tone: 'lavender' });
  });

  const day = useMemo(() => days?.find((d) => d.date === today), [days, today]);

  if (!settings || !days || !entries || !sessions || !sets || active === undefined || !foods || !weekEntries || !monthEntries || !measurements) {
    return <div className="page" />;
  }

  const { totals, rings, targets } = dayRings(settings, today, day, entries);
  const up = nextUp(settings, sessions, sets, days);
  const weeks = weeksFor(settings, sessions, today);
  const streak = stepStreakFor(settings, days, today);
  const trainedToday = doneSessions(sessions).filter((s) => s.date === today);
  const flag = recentFlag(settings.plan, sessions, days, today);

  const now = new Date();
  const hour = now.getHours();
  const prevWeigh = [...days].filter((d) => d.date < today && d.weightKg !== undefined).sort((a, b) => b.date.localeCompare(a.date))[0];
  const sleepMin = day?.sleep ? sleepMinutes(day.sleep.asleep, day.sleep.woke) : undefined;
  const sessionName = up && settings.plan ? findSession(settings.plan, up.sessionId)?.name ?? `Session ${up.sessionId}` : 'Your session';
  const stepsLeft = stepsGoal(targets, day?.eased) - totals.steps;
  const loop = settings.loopSteps ?? 0;

  let moment: Moment = hour >= 17 ? 'evening' : 'day';
  if (rings.perfect) moment = 'perfect';
  else if (hour < 11 && !day?.morning) moment = 'morning';
  else if (sleepMin !== undefined && sleepMin < 360 && hour < 16) moment = 'shortNight';
  else if (day?.weightKg !== undefined && prevWeigh?.weightKg !== undefined && day.weightKg - prevWeigh.weightKg >= 0.5 && hour < 12) moment = 'weightUp';
  else if (totals.freeMeal) moment = 'freeMeal';
  else if (trainedToday.length) moment = 'trained';
  else if (hour >= 19 && stepsLeft > 0 && stepsLeft <= 1500) moment = 'stepsClose';
  else if (rings.protein.closed) moment = 'proteinClosed';
  else if (up && !active && weeks.thisWeek < weeks.perWeek) moment = 'session';
  else if (up && weeks.thisWeek >= weeks.perWeek) moment = 'rest';

  const line = flag
    ? plainFlagLine(flag.flag.group, swapSentence(settings.plan, flag.flag.swap))
    : voiceLine(voiceFor(settings.voice, prefOn(settings.prefs, 'shuffleVoices'), today), moment, today, {
        session: sessionName,
        steps: fmtInt(Math.max(stepsLeft, 0)),
        laps: loop ? fmtInt(Math.ceil(Math.max(stepsLeft, 0) / loop)) : 'a few',
        sleep: sleepMin !== undefined ? fmtDuration(sleepMin) : '',
        protein: `${Math.round(totals.protein)} g`,
      });

  const room = roomLeft(totals, targets);
  const usage = usageOf(monthEntries);
  const fits = foods.length && room.kcalHi > 0 ? bestFits(foods, room, totals, targets, { max: 4, home: day?.home, usage }) : [];
  const slots = checklistSlots(settings);
  const ticked = slots.filter((s) => day?.ticks?.[s.key]);
  const nextSlot = slots.find((s) => !day?.ticks?.[s.key]);
  const water = day?.waterMl ?? 0;

  const logWater = async () => {
    await addWater(today, 250);
    toast({ text: `Water: ${fmtLitres(water + 250)} of ${fmtLitres(targets.waterMl)} L`, action: { label: 'Undo', run: () => addWater(today, -250) } });
  };

  if (settings.prefs.nightMode && isNightTime(now) && !showAll) {
    return <TodayNight settings={settings} today={today} days={days} totals={totals} rings={rings} up={up} trainedToday={trainedToday} onShowAll={() => setShowAll(true)} />;
  }

  const ticker = prefOn(settings.prefs, 'ticker');
  return (
    <>
    {ticker && <Ticker ctx={tickerContext(settings, today, days, monthEntries, sessions, sets, measurements, unlockedCount ?? 0)} />}
    <div className={`page${ticker ? ' after-ticker' : ''}`}>
      <div className="row top">
        <div className="col gap8">
          <div className="lbl">{fmtDayLong(today)}</div>
          <h1 className="h1">
            {greeting(now)}
            {settings.name ? `, ${settings.name}` : ''}
          </h1>
          <div className="voice" style={flag ? { fontStyle: 'normal', fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--apricot)' } : undefined}>
            {line}
          </div>
        </div>
        <button type="button" onClick={() => go('/you')} aria-label="You and settings" style={{ width: 48, height: 48, position: 'relative', flexShrink: 0 }}>
          <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
            <circle cx="24" cy="24" r="22" fill="var(--surface)" stroke="var(--hairline)" strokeWidth="2" />
            {weeks.thisWeek > 0 && (
              <circle
                cx="24"
                cy="24"
                r="22"
                fill="none"
                stroke="var(--gold)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={`${Math.min(weeks.thisWeek / weeks.perWeek, 1) * 138} 138`}
                transform="rotate(-90 24 24)"
              />
            )}
          </svg>
          <span className="sf" style={{ position: 'relative', fontSize: 18 }}>
            {(settings.name || 'You').charAt(0).toUpperCase()}
          </span>
        </button>
      </div>

      <SeasonStrip settings={settings} today={today} />

      <ForecastCard settings={settings} today={today} days={days} entries={monthEntries} sessions={sessions} sets={sets} />

      <OccasionCard settings={settings} today={today} />

      <Banners />

      <button type="button" className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }} onClick={() => go('/food')}>
        <div onPointerDown={konami.onPointerDown} onPointerUp={konami.onPointerUp} onClickCapture={konami.onClickCapture} style={konami.style}>
          <Rings
            progress={[rings.kcal.progress, rings.protein.progress, rings.steps.progress]}
            label={`Rings: ${rings.closed} of 3 closed`}
            gold={!!unlocked && hasReward(unlocked, 'Gold rings') && prefOn(settings.prefs, 'goldRings')}
            center={`${rings.closed}/3`}
          />
        </div>
        <div className="grow col gap12">
          <div className="col gap2">
            <div className="lbl apri">{rings.kcal.closed ? 'Calories · in range' : rings.kcal.state === 'over' ? 'Calories · over range' : 'Calories'}</div>
            <div className="tn t17">
              {fmtInt(totals.kcal)}{' '}
              <span className="t13 q">
                of {fmtInt(targets.kcalMin)}–{fmtInt(targets.kcalMax)}
              </span>
            </div>
          </div>
          <div className="col gap2">
            <div className="lbl lav">Protein{rings.protein.closed ? ' · closed' : ''}</div>
            <div className="tn t17">
              {Math.round(totals.protein)} g <span className="t13 q">of {targets.proteinG} g</span>
            </div>
          </div>
          <div
            className="col gap2"
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              openSheet('steps');
            }}
          >
            <div className="lbl sage">Steps{rings.steps.closed ? ' · closed' : ''}</div>
            <div className="tn t17">
              {day?.steps !== undefined ? fmtInt(totals.steps) : '—'} <span className="t13 q">of {fmtInt(stepsGoal(targets, day?.eased))}</span>
            </div>
          </div>
        </div>
      </button>

      {fits.length > 0 && !rings.kcal.closed && (totals.kcal >= targets.kcalMin * 0.4 || hour >= 16) && (
        <button type="button" className="card" onClick={() => openSheet('whatsleft')}>
          <div className="row">
            <div className="lbl">What can I still eat?</div>
            <Icon name="right" size={16} stroke={1.8} color="var(--dim)" />
          </div>
          <div className="t15 lh">
            Room left: {room.kcalLo > 0 ? `${fmtInt(room.kcalLo)}–` : 'up to '}
            {Number.isFinite(room.kcalHi) ? fmtInt(room.kcalHi) : '∞'} kcal
            {room.protein > 0 ? ` and ${Math.round(room.protein)} g of protein` : ''}. {fitSentence(fits[0].items.map((i) => i.food.name), fits[0].inRange && fits[0].closesProtein)}
          </div>
          <div className="row t13 tn">
            <span className="apri">+{fmtInt(fits[0].kcal)} kcal</span>
            <span className="lav">+{fits[0].protein} g protein</span>
            <span className="d">{fits.length > 1 ? `${fits.length - 1} other fit${fits.length > 2 ? 's' : ''}` : ''}</span>
          </div>
        </button>
      )}

      <NextUpCard settings={settings} up={up} active={active} trainedToday={trainedToday} weeks={weeks} />

      <div className="grid3">
        <div className="card sm">
          <div className="lbl sm blue">Water</div>
          <div className="num tn" style={{ fontSize: 22 }}>
            {fmtLitres(water)}
            <span className="t12 q"> L</span>
          </div>
          <div className="bar">
            <i style={{ width: `${Math.min(water / targets.waterMl, 1) * 100}%`, background: 'var(--blue)' }} />
          </div>
          <button type="button" className="btn ghost sm" style={{ marginTop: 4, height: 34, fontSize: 13 }} onClick={logWater}>
            +250 ml
          </button>
        </div>
        {slots.length > 0 ? (
          <button type="button" className="card sm" onClick={() => openSheet('checklist')}>
            <div className="lbl sm">Checklist</div>
            <div className="num tn" style={{ fontSize: 22 }}>
              {ticked.length}
              <span className="t12 q"> of {slots.length}</span>
            </div>
            <div className="row" style={{ gap: 5, justifyContent: 'flex-start', flexWrap: 'wrap' }}>
              {slots.slice(0, 8).map((s) => (
                <i
                  key={s.key}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    background: day?.ticks?.[s.key] ? 'var(--text)' : 'transparent',
                    border: day?.ticks?.[s.key] ? 0 : '1.5px solid var(--faint)',
                  }}
                />
              ))}
            </div>
            <div className="t12 q" style={{ marginTop: 4 }}>
              {nextSlot ? `${nextSlot.name}, ${nextSlot.slot.toLowerCase()}` : 'All done'}
            </div>
          </button>
        ) : (
          <button type="button" className="card sm" onClick={() => openSheet('steps')}>
            <div className="lbl sm sage">Steps</div>
            <div className="num tn" style={{ fontSize: 22 }}>
              {day?.steps !== undefined ? fmtInt(day.steps) : '—'}
            </div>
            <div className="t12 q">{day?.stepsAt ? `at ${fmtTime(day.stepsAt)}` : 'Tap to log'}</div>
          </button>
        )}
        <button type="button" className="card sm" onClick={() => openSheet('morning')}>
          <div className="lbl sm">Morning log</div>
          <div className="num" style={{ fontSize: 22 }}>
            {day?.morning ? 'Done' : 'Not yet'}
          </div>
          <div className="t12 q">{day?.morning ? fmtTime(day.morning.at) : 'Weight, sleep, steps'}</div>
          {day?.morning?.seconds !== undefined && (
            <div className={`t12 ${settings.morningBest === day.morning.seconds ? 'gold' : 'q'}`}>
              {day.morning.seconds.toFixed(1)} s{settings.morningBest === day.morning.seconds ? ' · best' : ''}
            </div>
          )}
        </button>
      </div>

      <Timeline day={day} entries={entries} sessions={sessions.filter((s) => s.date === today)} settings={settings} />

      <WeekStrip settings={settings} today={today} days={days} entries={weekEntries} sessions={sessions} streak={streak} weeks={weeks} />
    </div>
    </>
  );
}

function fitSentence(names: string[], closesBoth: boolean): string {
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return closesBoth ? `${list} would close both rings.` : `Best fit: ${list}.`;
}

function Timeline({ day, entries, sessions, settings }: { day: Day | undefined; entries: FoodEntry[]; sessions: TrainingSession[]; settings: Settings }) {
  type Row = { at: number | null; title: string; sub: string; right?: { a: string; b?: string; cls?: string }; open: () => void };
  const rows: Row[] = [];

  if (day?.morning) {
    const bits: string[] = [];
    if (day.weightKg !== undefined) bits.push(`${fmt1(day.weightKg)} kg`);
    if (day.sleep) bits.push(`slept ${fmtDuration(sleepMinutes(day.sleep.asleep, day.sleep.woke))}`);
    if (day.sleep?.rested) bits.push(`rested ${day.sleep.rested}/5`);
    rows.push({ at: day.morning.at, title: 'Morning log', sub: bits.join(' · ') || 'Saved', open: () => openSheet('morning') });
  }

  const slots = checklistSlots(settings);
  const ticks = slots.filter((s) => day?.ticks?.[s.key]);
  if (ticks.length) {
    const first = Math.min(...ticks.map((s) => day!.ticks![s.key]));
    const names = ticks.map((s) => (settings.checklist.find((i) => i.id === s.itemId)?.slots.length ?? 0) > 1 ? `${s.name} (${s.slot.toLowerCase()})` : s.name);
    rows.push({ at: first, title: 'Checklist', sub: names.join(', '), open: () => openSheet('checklist') });
  }

  for (const meal of MEALS) {
    const es = entries.filter((e) => e.meal === meal);
    if (!es.length) continue;
    const kcal = es.reduce((s, e) => s + e.kcal, 0);
    const protein = es.reduce((s, e) => s + e.protein, 0);
    rows.push({
      at: Math.min(...es.map((e) => e.at)),
      title: MEAL_NAMES[meal],
      sub: es.map((e) => (e.kind === 'drink' ? `${e.name} ×${e.drink?.count ?? 1}` : e.name)).join(', '),
      right: { a: fmtInt(kcal), b: `${Math.round(protein)} g` },
      open: () => go('/food'),
    });
  }

  for (const s of sessions) {
    const def = settings.plan ? findSession(settings.plan, s.session) : undefined;
    const mins = Math.round(((s.endedAt ?? Date.now()) - s.startedAt) / 60000);
    rows.push({
      at: s.startedAt,
      title: def?.name ?? `Session ${s.session}`,
      sub: s.status === 'active' ? 'In progress' : `${mins} min${s.short ? ' · short session' : ''}`,
      open: () => (s.status === 'active' ? go('/session') : go('/session/view', { id: s.id })),
    });
  }

  rows.sort((a, b) => (a.at ?? Infinity) - (b.at ?? Infinity));

  if (day?.steps !== undefined) {
    rows.push({
      at: null,
      title: 'Steps',
      sub: day.stepsAt ? `Updated ${fmtTime(day.stepsAt)}` : 'Logged',
      right: { a: fmtInt(day.steps), cls: 'sage' },
      open: () => openSheet('steps'),
    });
  }
  if (day?.waterMl) {
    const glasses = Math.round(day.waterMl / 250);
    rows.push({
      at: null,
      title: 'Water',
      sub: `${glasses} glass${glasses === 1 ? '' : 'es'}`,
      right: { a: `${fmtLitres(day.waterMl)} L`, cls: 'blue' },
      open: () => openSheet('water'),
    });
  }

  return (
    <div className="card" style={{ gap: 0, paddingBottom: 12 }}>
      <div className="row" style={{ paddingBottom: 10 }}>
        <div className="lbl">Today's log</div>
        <div className="t13 d">Timeline</div>
      </div>
      {rows.length === 0 && <div className="t14 q" style={{ padding: '4px 0 12px' }}>Nothing yet. Everything you log today lines up here.</div>}
      {rows.map((r, i) => (
        <button type="button" key={i} className="tl" onClick={r.open}>
          <div className="time">{r.at === null ? 'All day' : fmtTime(r.at)}</div>
          <div className="col gap2" style={{ minWidth: 0 }}>
            <div className="t15">{r.title}</div>
            <div className="t13 q">{r.sub}</div>
          </div>
          <div className={`t13 tn right ${r.right?.cls ?? ''}`}>
            {r.right?.a}
            {r.right?.b && <div className="lav">{r.right.b}</div>}
          </div>
        </button>
      ))}
      <button type="button" className="dashed" style={{ marginTop: 10 }} onClick={() => openSheet('log')}>
        + Add to today
      </button>
    </div>
  );
}

function WeekStrip({
  settings,
  today,
  days,
  entries,
  sessions,
  streak,
  weeks,
}: {
  settings: Settings;
  today: DayKey;
  days: Day[];
  entries: FoodEntry[];
  sessions: TrainingSession[];
  streak: ReturnType<typeof stepStreakFor>;
  weeks: ReturnType<typeof weeksFor>;
}) {
  const ws = weekStart(today);
  const week = dayRange(ws, addDays(ws, 6));
  const done = new Set(doneSessions(sessions).map((s) => s.date));
  let perfect = 0;
  const cells = week.map((d) => {
    const day = days.find((x) => x.date === d);
    const { rings } = dayRings(settings, d, day, entries.filter((e) => e.date === d));
    if (rings.perfect && d <= today) perfect++;
    return { d, perfect: rings.perfect && d <= today, trained: done.has(d) };
  });
  return (
    <div className="card" style={{ gap: 14 }}>
      <div className="week7">
        {cells.map((c) => (
          <div key={c.d}>
            <div className={`t12 ${c.d === today ? '' : 'q'}`} style={c.d === today ? { fontWeight: 600 } : undefined}>
              {weekdayName(c.d).charAt(0)}
            </div>
            <div className={`wdot${c.perfect ? ' full' : c.d === today ? ' today' : c.d > today ? ' future' : ''}`} />
            <div className={`wpip${c.trained ? ' on' : ''}`} />
          </div>
        ))}
      </div>
      <div className="row t13 q">
        <span>
          {perfect} perfect day{perfect === 1 ? '' : 's'} · workouts {Math.min(weeks.thisWeek, weeks.perWeek)} of {weeks.perWeek}
        </span>
        <span>
          {streak.current > 0 ? `Steps ${streak.current} day${streak.current === 1 ? '' : 's'}` : 'No step streak yet'}
          {streak.shields > 0 ? ` · ${streak.shields} shield${streak.shields === 1 ? '' : 's'}` : ''}
        </span>
      </div>
      {targetsFor(settings, today).steps > 0 && streak.current > 0 && streak.shields < 2 && (
        <div className="t12 d">
          Next shield in {streak.toNextShield} day{streak.toNextShield === 1 ? '' : 's'} of {fmtInt(targetsFor(settings, today).steps)}+ steps.
        </div>
      )}
    </div>
  );
}
