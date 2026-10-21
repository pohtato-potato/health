import { useMemo, useState } from 'react';
import { addDays, logHour, weekStart } from '../domain/dates';
import { fmtDuration, fmtInt, fmtTime } from '../domain/format';
import { findSession } from '../domain/plan';
import { sleepMinutes, stepsGoal } from '../domain/rings';
import { pinnedLine, voiceLine, plainFlagLine, type Moment } from '../domain/voice';
import { addEntries, bump, deleteEntry, setSteps, setTick } from '../db/actions';
import { useKonami } from '../ui/useKonami';
import { useActiveSession, useAllDays, useAllSets, useEntries, useEntriesBetween, useFoods, useSessions, useSettings, useToday } from '../db/hooks';
import { prefOn } from '../domain/types';
import { voiceFor } from '../domain/voice';
import { kmFromSteps, positionAt } from '../domain/walk';
import { landmarkFor } from '../walk/art/landmarks';
import { walkCaption } from '../domain/walkCaption';
import { WalkTop } from './today/WalkTop';
import { RingsNumbers } from './today/RingsNumbers';
import { TodayLayout } from './today/TodayLayout';
import { DrawerHandle, TodayDrawer } from './today/TodayDrawer';
import { proteinState } from '../domain/proteinState';
import { ChecklistChips, MealTiles, UsualChips, mealTotals } from './today/LogBelow';
import { LogSearch } from '../sheets/LogSearch';
import { sameAsYesterday, usualFoods } from '../domain/usual';
import { mealForTime, portionFor, valuesFor } from '../domain/foods';
import { checklistSlots } from '../state/derived';
import type { Meal } from '../domain/types';
import { MomentCard } from './today/MomentCard';
import { useGapAdd } from './today/useGapAdd';
import { momentFor } from '../domain/todayMoment';
import { TodayLine } from './today/TodayLine';
import { glanceLine } from '../domain/glance';
import { logMinutes } from '../domain/todayMoment';
import { WalkFull } from './today/WalkFull';
import { placeFor } from '../domain/places';
import { proteinGap } from '../domain/proteinGap';
import { WalkScene } from '../walk/WalkScene';
import { go, openSheet } from '../router';
import { Rings } from '../ui/Rings';
import { useToast } from '../ui/Toasts';
import {
  dayRings,
  doneSessions,
  nextUp,
  recentFlag,
  swapSentence,
  weeksFor,
} from '../state/derived';
import { Banners } from './Banners';
import '../styles/today.css';
import { forecastData } from '../state/forecastData';
import { readyWord } from '../domain/readiness';
import { SeasonStrip, useUnlockedIds } from '../ui/Theme';
import { hasReward } from '../domain/rewards';
import { NextUpCard } from './NextUpCard';
import { RecordsStrip } from './today/NextStrip';
import { tonight } from '../domain/trainView';
import { fmtSet } from '../domain/setText';
import { regionAt } from '../domain/regions';
import { themeDayOn } from '../domain/calendar';
import { ThemedRings } from '../ui/rings/ThemedRings';
import { daysBetween } from '../domain/dates';
import { journeyStart as journeyStartOf } from './Journey';
import { seasonalThemeOn } from '../domain/themes';
import type { Festive } from '../walk/art/festive';

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
  const konami = useKonami(() => {
    void bump('konami');
    toast({ kicker: '↑ ↑ ↓ ↓ ← → ← →', text: 'Konami code accepted.', sub: 'Thirty lives not included. The Retro theme is yours.', tone: 'lavender' });
  });

  const day = useMemo(() => days?.find((d) => d.date === today), [days, today]);
  const [walkOpen, setWalkOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const gapAdd = useGapAdd(today, foods);

  if (!settings || !days || !entries || !sessions || !sets || active === undefined || !foods || !weekEntries || !monthEntries) {
    return <div className="page" />;
  }

  const { totals, rings, targets } = dayRings(settings, today, day, entries);
  const up = nextUp(settings, sessions, sets, days);
  const weeks = weeksFor(settings, sessions, today, days);
  const trainedToday = doneSessions(sessions).filter((s) => s.date === today);
  const flag = recentFlag(settings.plan, sessions, days, today);

  const now = new Date();
  // Hours on the logging day: at 1 am it is still the evening before.
  const hour = logHour(now.getTime());
  const prevWeigh = [...days].filter((d) => d.date < today && d.weightKg !== undefined).sort((a, b) => b.date.localeCompare(a.date))[0];
  const sleepMin = day?.sleep ? sleepMinutes(day.sleep.asleep, day.sleep.woke) : undefined;
  const sessionName = up && settings.plan ? findSession(settings.plan, up.sessionId)?.name ?? `Session ${up.sessionId}` : 'Your session';
  const stepsLeft = stepsGoal(targets, totals.eased) - totals.steps;
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

  const walkKm = kmFromSteps(days.reduce((n, d) => n + (d.steps ?? 0), 0));
  const themeDay = themeDayOn(today, regionAt(walkKm), { birthday: settings.birthday });
  // The voice speaks only at moments; otherwise the plain glance line.
  const recordsTonight = tonight(sessions, sets, today)?.records ?? [];
  const voiceNow = moment === 'perfect' || moment === 'proteinClosed' || (moment === 'trained' && recordsTonight.length > 0);
  const sessionTonight = up && !active && !trainedToday.length && weeks.thisWeek < weeks.perWeek ? sessionName : undefined;
  const lineKind: 'glance' | 'voice' | 'flag' = flag ? 'flag' : voiceNow ? 'voice' : 'glance';
  const lineText = flag ? line : voiceNow ? lineForTheDay(today, moment, line) : glanceLine({ minutes: logMinutes(Date.now()), closedRings: rings.closed, dayClosed: !!day?.foodDone, sessionTonight, nextSession: day?.foodDone && up ? sessionName : undefined, morningDone: !!day?.morning });
  const gap = proteinGap({ protein: totals.protein, proteinTarget: targets.proteinG, kcal: totals.kcal, kcalMax: targets.kcalMax }, foods, monthEntries, Date.now());
  const addGap = () => void gapAdd(gap.picks);
  const ready = forecastData(settings, today, days, monthEntries.filter((e) => e.date >= addDays(today, -2)), sessions, sets).readiness;
  const dayN = daysBetween(journeyStartOf(settings, days), today) + 1;
  const pos = positionAt(walkKm);
  const ahead = pos.to ?? pos.from;
  const here = settings.places?.length ? placeFor(day, settings, Date.now()) : undefined;
  const caption = walkCaption({ date: today, place: here?.name, status: day?.status, near: pos.from.name, dayN, kmToNext: pos.to ? Math.max(0, pos.to.km - walkKm) : 0, landmark: landmarkFor(ahead.name)?.label ?? ahead.name });
  const festive = prefOn(settings.prefs, 'seasonal') ? (seasonalThemeOn(today, settings.birthday) as Festive | undefined) : undefined;
  const scene = <WalkScene km={walkKm} dayN={dayN} caption={false} festive={festive} />;
  const mealNow = mealForTime();
  const usual = usualFoods(monthEntries, foods, mealNow, today);
  const addUsual = async (id: string) => {
    const u = usual.find((x) => x.food.id === id);
    if (!u) return;
    const v = valuesFor(u.food, u.amount);
    const added = await addEntries([{ date: today, meal: mealNow, at: Date.now(), kind: 'food', foodId: u.food.id, name: u.food.name, amount: u.amount, portion: portionFor(u.food, u.amount), kcal: v.kcal, protein: v.protein }]);
    toast({ text: `Added ${u.food.name}`, sub: `${portionFor(u.food, u.amount)} · your usual. Open the meal to change it.`, action: { label: 'Undo', run: () => added.forEach((e) => void deleteEntry(e.id)) } });
  };
  const perMeal = mealTotals(entries);
  const MEALS: Meal[] = ['breakfast', 'lunch', 'snacks', 'dinner'];
  const repeat = async (m: Meal) => {
    const copies = sameAsYesterday(monthEntries, m, today, Date.now());
    if (!copies.length) return;
    const added = await addEntries(copies);
    toast({ text: `${m.charAt(0).toUpperCase() + m.slice(1)}: same as yesterday`, sub: `${added.length} item${added.length === 1 ? '' : 's'} added`, action: { label: 'Undo', run: () => added.forEach((e) => void deleteEntry(e.id)) } });
  };
  const slots = checklistSlots(settings, today);
  return (
    <TodayLayout
      overlays={
        <>
          {walkOpen && <WalkFull scene={<WalkScene km={walkKm} dayN={dayN} caption={false} hero festive={festive} />} caption={caption} settings={settings} today={today} day={day} onClose={() => setWalkOpen(false)} />}
          {drawerOpen && (
      <TodayDrawer
        voice={flag ? line : lineForTheDay(today, moment, line)}
        readiness={{ score: ready.known ? ready.score : undefined, reason: readyWord(ready) }}
        protein={{ text: proteinState({ gapG: gap.gapG, closed: rings.protein.closed, dayClosed: !!day?.foodDone }), foods: gap.picks.map((p) => p.name).join(' and ') }}
        dayClosed={!!day?.foodDone}
        onReadiness={() => go('/readiness')}
        onAddGap={addGap}
        onCloseDay={() => go('/close')}
        onClose={() => setDrawerOpen(false)}
      />
    )}
        </>
      }
      walk={<WalkTop caption={caption} scene={scene} onOpen={() => setWalkOpen(true)} />}
      banner={<Banners />}
      line={<TodayLine text={lineText} kind={lineKind} gold={moment === 'perfect'} clock={fmtTime(Date.now())} why={themeDay ? { name: themeDay.name, text: themeDay.why } : undefined} />}
      season={<SeasonStrip settings={settings} today={today} />}
      rings={
        <RingsNumbers
        rows={[
          { key: 'kcal', name: 'Calories', value: fmtInt(totals.kcal), unit: 'kcal', target: `${fmtInt(targets.kcalMin)}–${fmtInt(targets.kcalMax)} kcal`, ink: 'var(--kcal)', known: true },
          { key: 'protein', name: 'Protein', value: String(Math.round(totals.protein)), unit: 'g', target: `of ${targets.proteinG} g`, ink: 'var(--protein)', known: true },
          { key: 'steps', name: 'Steps', value: day?.steps !== undefined ? fmtInt(totals.steps) : '—', unit: 'steps', target: `${totals.eased ? 'eased to ' : 'of '}${fmtInt(stepsGoal(targets, totals.eased))}`, ink: 'var(--steps)', known: day?.steps !== undefined },
        ]}
        closed={rings.closed}
        rings={
          <div className="td-ringfig" onPointerDown={konami.onPointerDown} onPointerUp={konami.onPointerUp} onClickCapture={konami.onClickCapture} style={konami.style}>
            {themeDay ? (
              <ThemedRings style={themeDay.ring} progress={[rings.kcal.progress, rings.protein.progress, rings.steps.progress]} label={`Rings for ${themeDay.name}: ${rings.closed} of 3 closed`} center={`${rings.closed}/3`} />
            ) : (
              <Rings progress={[rings.kcal.progress, rings.protein.progress, rings.steps.progress]} label={`Rings: ${rings.closed} of 3 closed`} gold={!!unlocked && hasReward(unlocked, 'Gold rings') && prefOn(settings.prefs, 'goldRings')} center={`${rings.closed}/3`} />
            )}
          </div>
        }
        onLogFood={() => go('/food')}
        onSaveSteps={(n) => void setSteps(today, n)}
        showCopyHint={logMinutes(Date.now()) >= 19 * 60}
      />
      }
      moment={
        <MomentCard
        kind={momentFor({ minutes: logMinutes(Date.now()), status: day?.status, morningDone: !!day?.morning, perfect: rings.perfect, dayClosed: !!day?.foodDone, proteinGapG: gap.gapG, stepsLeft: Math.max(0, stepsLeft) })}
        data={{
          closedRings: rings.closed,
          proteinGapG: gap.gapG,
          gapFoods: gap.picks.map((p) => p.name).join(' and '),
          addLabel: `${gap.picks.length === 1 ? 'Add it' : gap.picks.length === 2 ? 'Add both' : 'Add them'} · ${Math.round(gap.picks.reduce((n, p) => n + p.proteinG, 0))} g`,
          stepsLeft: Math.max(0, stepsLeft),
          laps: loop ? fmtInt(Math.ceil(Math.max(stepsLeft, 0) / loop)) : undefined,
          easedTo: totals.eased ? stepsGoal(targets, true) : undefined,
        }}
        actions={{ logMorning: () => openSheet('morning'), closeDay: () => go('/close'), addGap, typeSteps: () => openSheet('steps') }}
      />
      }
      next={recordsTonight.length ? (
        <RecordsStrip records={recordsTonight.map((r) => `${r.exercise} ${fmtSet(r)}`)} onFinale={() => go('/train', { state: 'after' })} />
      ) : (
        <NextUpCard settings={settings} up={up} active={active} trainedToday={trainedToday} weeks={weeks} ready={readyWord(ready)} />
      )}
      log={
        <section className="td-log" data-section="log" aria-label="Log">
        {usual.length > 0 && (
          <>
            <h2 className="td-h">Your usual {mealNow}</h2>
            <UsualChips items={usual.map((u) => ({ id: u.food.id, name: u.food.name, portion: portionFor(u.food, u.amount) }))} onAdd={(id) => void addUsual(id)} />
          </>
        )}
        <LogSearch foods={foods} onAction={(a) => (a.sheet ? openSheet(a.sheet) : go(a.route!))} onFood={(f) => openSheet('addfood', { food: f.id })} onQuick={() => openSheet('quick')} />
        <h2 className="td-h">Meals today</h2>
        <MealTiles meals={MEALS.map((m) => ({ meal: m, kcal: perMeal[m]?.kcal, protein: perMeal[m]?.protein, canRepeat: sameAsYesterday(monthEntries, m, today, 0).length > 0 }))} onOpen={(m) => go('/food', { meal: m })} onRepeat={(m) => void repeat(m)} />
        {slots.length > 0 && (
          <>
            <h2 className="td-h">Checklist</h2>
            <p className="td-hint">Press and hold to tick.</p>
            <ChecklistChips items={slots.map((x) => ({ key: x.key, name: slots.filter((y) => y.itemId === x.itemId).length > 1 ? `${x.name} · ${x.slot}` : x.name, on: !!day?.ticks?.[x.key] }))} onToggle={(key, on) => void setTick(today, key, on)} />
          </>
        )}
      </section>
      }
      handle={<DrawerHandle ready={ready.known ? ready.score : undefined} protein={proteinState({ gapG: gap.gapG, closed: rings.protein.closed, dayClosed: !!day?.foodDone })} closeLabel={day?.foodDone ? 'Day closed' : 'Close the day'} onOpen={() => setDrawerOpen(true)} />}
    />
  );
}

function lineForTheDay(today: string, moment: string, line: string): string {
  const key = 'health.line';
  try {
    const kept = JSON.parse(localStorage.getItem(key) ?? 'null') as { date: string; moment: string; line: string } | null;
    const p = pinnedLine(kept, today, moment, line);
    if (p.keep !== kept) localStorage.setItem(key, JSON.stringify(p.keep));
    return p.line;
  } catch {
    /* storage can be unavailable; the line just isn't pinned */
  }
  return line;
}

