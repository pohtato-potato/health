import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { addDays, dayKey, logHour, weekStart } from '../domain/dates';
import { revealDue } from '../domain/creatures';
import { fmtDayShort, fmtDuration, fmtInt, fmtTime } from '../domain/format';
import { findSession } from '../domain/plan';
import { sleepMinutes, stepsGoal } from '../domain/rings';
import { pinnedLine, spokenLine, plainFlagLine, type Moment } from '../domain/voice';
import { addEntries, bump, deleteEntry, setSteps, setTick } from '../db/actions';
import { useKonami } from '../ui/useKonami';
import { useActiveSession, useAllDays, useAllSets, useEntries, useEntriesBetween, useFoods, useMeasurements, useSessions, useNow, useSettings, useToday, useBody } from '../db/hooks';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { chipFor } from '../domain/statusChip';
import { weighInToCome } from '../domain/morningLog';
import { OfficeUsual } from './today/OfficeUsual';
import { bodyTileWords } from '../domain/bodyLog';
import { prefOn } from '../domain/types';
import { kmFromSteps } from '../domain/walk';
import { RingsNumbers } from './today/RingsNumbers';
import { LiveRings } from './today/LiveRings';
import { RingMomentFx } from './today/RingMomentFx';
import { useRingMoment } from './today/useRingMoment';
import { RING_WORD, ringsGold } from '../domain/ringMoments';
import { lookOf } from '../domain/themes';
import { useLiveTheme } from '../ui/live/useLiveTheme';
import { MEAL_NAMES } from '../domain/types';
import { closedWords } from './today/TodayLine';
import { TodayLayout, panelVars } from './today/TodayLayout';
import { DrawerHandle, TodayDrawer } from './today/TodayDrawer';
import { proteinState } from '../domain/proteinState';
import { ChecklistPanel, LogBuckets, MealsPanel, mealTotals } from './today/LogBelow';
import { LogSearch } from '../sheets/LogSearch';
import { sameAsYesterday, usualFoods } from '../domain/usual';
import { mealForTime } from '../domain/foods';
import { checklistSlots } from '../state/derived';
import type { Meal } from '../domain/types';
import { MomentCard, type NextKind } from './today/MomentCard';
import { useGapAdd } from './today/useGapAdd';
import { momentFor } from '../domain/todayMoment';
import { tickFor } from '../domain/checklist';
import { TodayLine } from './today/TodayLine';
import { glanceLine } from '../domain/glance';
import { logMinutes } from '../domain/todayMoment';
import { placeFor } from '../domain/places';
import { proteinGap } from '../domain/proteinGap';
import { go, openSheet, useRoute } from '../router';
import { devGlow } from '../ui/live/regionTint';
import { dayGlow } from '../domain/dayGlow';
import { useMoments } from '../ui/Moments';
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
import { OnThisDayCard } from './OnThisDay';
import '../styles/today.css';
import { SeasonStrip, useUnlockedIds } from '../ui/Theme';
import { hasReward } from '../domain/rewards';
import { RecordsStrip } from './today/NextStrip';
import { recordGains, tonight } from '../domain/trainView';
import { regionAt } from '../domain/regions';
import { themeDayOn } from '../domain/calendar';

// Football's card loads with Football's data, apart from Today's own bundle.
const MatchToday = lazy(() => import('./today/MatchToday').then((m) => ({ default: m.MatchToday })));

export function Today() {
  const unlocked = useUnlockedIds();
  const settings = useSettings();
  const theme = useLiveTheme(settings);
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
  const measurements = useMeasurements();
  const checkins = useLiveQuery(() => db.checkins.toArray(), []);
  const body = useBody();
  const toast = useToast();
  const konami = useKonami(() => {
    void bump('konami');
    toast({ kicker: '↑ ↑ ↓ ↓ ← → ← →', text: 'Konami code accepted.', sub: 'Thirty lives not included. The Retro theme is yours.', tone: 'lavender' });
  });

  const day = useMemo(() => days?.find((d) => d.date === today), [days, today]);
  // The clock, the line and the moment card follow the time: re-render each minute and when the app comes back.
  const nowMs = useNow(60_000);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const gapAdd = useGapAdd(today, foods);
  const route = useRoute();
  const { busy: momentShowing } = useMoments();
  const [ringSpin, setRingSpin] = useState(0);
  const [ringPlay, setRingPlay] = useState(0);
  const ringDay = settings && days && entries ? dayRings(settings, today, days.find((d) => d.date === today), entries).rings : undefined;
  const { playing, goldCount, perfectPlayed } = useRingMoment({
    date: today,
    closed: { kcal: !!ringDay?.kcal.closed, protein: !!ringDay?.protein.closed, steps: !!ringDay?.steps.closed, sleep: !!ringDay?.sleep.closed },
    hold: !ringDay || !!route.params.get('sheet') || momentShowing,
    rest: day?.status === 'sick' || day?.status === 'injured' || day?.status === 'break',
    momentsOn: !settings || prefOn(settings.prefs, 'moments'),
    ding: !!settings?.prefs.ding,
    buzzOn: !!settings?.prefs.buzz,
    quiet: !!settings && prefOn(settings.prefs, 'quietPublic'),
  });
  // The morning reveal opens right after the morning log is saved, once the sheet has closed.
  const dawnDue = !!settings && !!days && !active && !route.params.get('sheet') && revealDue({ day, logDay: today, calendarDay: dayKey(new Date()), momentsOn: prefOn(settings.prefs, 'moments') });
  useEffect(() => {
    if (dawnDue) go('/dawn');
  }, [dawnDue]);

  if (!settings || !days || !entries || !sessions || !sets || active === undefined || !foods || !weekEntries || !monthEntries || !measurements || !checkins || !body) {
    return <div className="page" />;
  }

  const { totals, rings, targets } = dayRings(settings, today, day, entries);
  const up = nextUp(settings, sessions, sets, days, false, 'home', body ?? []);
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
    : spokenLine(settings, today, moment, today, {
        session: sessionName,
        steps: fmtInt(Math.max(stepsLeft, 0)),
        laps: loop ? fmtInt(Math.ceil(Math.max(stepsLeft, 0) / loop)) : 'a few',
        sleep: sleepMin !== undefined ? fmtDuration(sleepMin) : '',
        protein: `${Math.round(totals.protein)} g`,
      });

  const walkKm = kmFromSteps(days.reduce((n, d) => n + (d.steps ?? 0), 0));
  const calendarOn = (d: string) => themeDayOn(d, regionAt(walkKm), { birthday: settings.birthday });
  // Creature themes and ring styles were retired with the creatures (R4-7): the calendar's theme days stay.
  const themeDay = calendarOn(today);
  // The voice speaks only at moments; otherwise the plain glance line.
  const recordsTonight = tonight(sessions, sets, today)?.records ?? [];
  const voiceNow = !!line && (moment === 'perfect' || moment === 'proteinClosed' || (moment === 'trained' && recordsTonight.length > 0));
  const sessionTonight = up && !active && !trainedToday.length && weeks.thisWeek < weeks.perWeek ? sessionName : undefined;
  const lineKind: 'glance' | 'voice' | 'flag' = flag ? 'flag' : voiceNow ? 'voice' : 'glance';
  const lineText = flag ? line : voiceNow ? lineForTheDay(today, moment, line) : glanceLine({ minutes: logMinutes(nowMs), closedRings: rings.closed, ringsOf: rings.of, dayClosed: !!day?.foodDone, sessionTonight, nextSession: day?.foodDone && up ? sessionName : undefined, morningDone: !!day?.morning });
  const gap = proteinGap({ protein: totals.protein, proteinTarget: targets.proteinG, kcal: totals.kcal, kcalMax: targets.kcalMax }, foods, monthEntries, Date.now());
  const addGap = () => void gapAdd(gap.picks);
  const here = settings.places?.length ? placeFor(day, settings, Date.now()) : undefined;
  // How the day went lights the land: gold for a perfect day or a record night, green for a session in range.
  const tn = tonight(sessions, sets, today);
  const glow = devGlow(dayGlow({ perfect: rings.perfect, session: tn && { records: tn.records.length, checks: tn.checks, formAvg: tn.formAvg } }), route.params);
  const mealNow = mealForTime();
  const usual = usualFoods(monthEntries, foods, mealNow, today);
  const perMeal = mealTotals(entries);
  const MEALS: Meal[] = ['breakfast', 'lunch', 'snacks', 'dinner'];
  const repeat = async (m: Meal) => {
    const copies = sameAsYesterday(monthEntries, m, today, Date.now());
    if (!copies.length) return;
    const added = await addEntries(copies);
    toast({ text: `${m.charAt(0).toUpperCase() + m.slice(1)}: same as yesterday`, sub: `${added.length} item${added.length === 1 ? '' : 's'} added`, action: { label: 'Undo', run: () => added.forEach((e) => void deleteEntry(e.id)) } });
  };
  const slots = checklistSlots(settings, today);
  const look = lookOf(theme);
  const closedFlags = { kcal: rings.kcal.closed, protein: rings.protein.closed, steps: rings.steps.closed, sleep: rings.sleep.closed };
  const momentKind = momentFor({ minutes: logMinutes(nowMs), status: day?.status, morningDone: !!day?.morning, perfect: rings.perfect, dayClosed: !!day?.foodDone, proteinGapG: gap.gapG, stepsLeft: Math.max(0, stepsLeft), stepsKnown: day?.steps !== undefined });
  const weighIn = weighInToCome(day, settings.places ?? []);
  // The morning log is the next thing to log at any hour until it is in (rest, a closed day and a perfect day aside).
  const morningOpen = !day?.morning && !['rest', 'closed', 'perfect'].includes(momentKind);
  // Finding 18 (O42): the weigh-in still to come leads only in the morning hours; after that the day's own moment
  // (the meals, the steps) leads and the weigh-in keeps its own small "Add it" row, the one way back to the sheet.
  const weighInDue = weighIn && !['rest', 'closed', 'morning', 'perfect'].includes(momentKind);
  const nextKind: NextKind = morningOpen ? 'morning' : weighInDue && hour < 11 ? 'weighin' : momentKind;
  const weighRow = weighInDue && nextKind !== 'weighin';
  const ringGold = ringsGold({ counting: goldCount, perfect: rings.perfect, played: perfectPlayed });
  // A perfect day (h7-perfect): the rings glow gold, but the numbers keep their own inks; no text turns gold.
  const rowInk = (k: keyof typeof INK_AT) => look.ring.inks[INK_AT[k]];
  return (
    <TodayLayout
      glow={!!glow}
      light={panelVars(look.ring.inks)}
      fx={<RingMomentFx playing={playing} />}
      overlays={
        <>
          {drawerOpen && (
            <TodayDrawer
              voice={flag ? line : lineForTheDay(today, moment, line)}
              body={bodyTileWords(body, today)}
              protein={{ text: proteinState({ gapG: gap.gapG, closed: rings.protein.closed, dayClosed: !!day?.foodDone }), foods: gap.picks.map((p) => p.name).join(' and ') }}
              dayClosed={!!day?.foodDone}
              onBody={() => go('/body')}
              onAddGap={addGap}
              onCloseDay={() => go('/close')}
              onClose={() => setDrawerOpen(false)}
            />
          )}
        </>
      }
      banner={<><OfficeUsual /><Banners noMorning={morningOpen} /><OnThisDayCard /></>}
      line={
        <TodayLine
          head="Today"
          level={1}
          sub={[fmtDayShort(today), here?.name, chipFor(days, today).now ? chipFor(days, today).text : undefined].filter(Boolean).join(' · ')}
          text={lineKind === 'flag' ? lineText : ''}
          kind={lineKind}
          clock={fmtTime(nowMs)}
          why={themeDay ? { name: themeDay.name, text: themeDay.why } : undefined}
          onOpen={() => setDrawerOpen(true)}
        />
      }
      season={<SeasonStrip settings={settings} today={today} />}
      dayChip={playing?.kind === 'ring' ? `${RING_WORD[playing.ring]} closed` : rings.perfect ? 'Perfect day' : rings.closed >= rings.of ? closedWords(rings.closed, rings.of) : `${rings.closed} of ${rings.of} closed`}
      perfect={rings.perfect}
      nextChip={rings.perfect && !day?.foodDone ? 'All met' : gap.gapG > 0 && !closedFlags.protein && !day?.foodDone ? `${Math.round(gap.gapG)} g to go` : undefined}
      nextInk={look.ring.inks[INK_AT.protein]}
      rings={
        <RingsNumbers
          rows={[
            { key: 'kcal', name: 'Calories', value: fmtInt(totals.kcal), unit: 'kcal', progress: rings.kcal.progress, target: `${fmtInt(targets.kcalMin)}–${fmtInt(targets.kcalMax)} kcal`, ink: rowInk('kcal'), known: true, done: closedFlags.kcal },
            { key: 'protein', name: 'Protein', value: String(Math.round(totals.protein)), unit: 'g', progress: rings.protein.progress, target: `of ${targets.proteinG} g`, ink: rowInk('protein'), known: true, done: closedFlags.protein },
            { key: 'steps', name: 'Steps', value: day?.steps !== undefined ? fmtInt(totals.steps) : '—', unit: '', progress: day?.steps !== undefined ? rings.steps.progress : 0, target: `${totals.eased ? 'eased to ' : 'of '}${fmtInt(stepsGoal(targets, totals.eased))}`, ink: rowInk('steps'), known: day?.steps !== undefined, done: closedFlags.steps },
            { key: 'sleep', name: 'Sleep', value: sleepMin !== undefined ? fmtDuration(sleepMin).replace(/ m$/, '') : '—', unit: '', progress: sleepMin !== undefined ? rings.sleep.progress : 0, target: `last night · aim ${fmtDuration(targets.sleepMin)}`, ink: rowInk('sleep'), known: sleepMin !== undefined, done: closedFlags.sleep },
          ]}
          closed={rings.closed}
          of={rings.of}
          play={ringPlay}
          rings={
            <div className="td-ringfig" onPointerDown={konami.onPointerDown} onPointerUp={konami.onPointerUp} onPointerCancel={konami.onPointerCancel} onClickCapture={konami.onClickCapture} style={konami.style}>
              <LiveRings
                progress={[rings.kcal.progress, rings.protein.progress, rings.steps.progress, rings.sleep.progress]}
                label={themeDay ? `Rings for ${themeDay.name}: ${rings.closed} of ${rings.of} closed` : `Rings: ${rings.closed} of ${rings.of} closed`}
                style={themeDay?.ring}
                design={look.ring.design}
                inks={look.ring.inks}
                goldClosed={!!unlocked && hasReward(unlocked, 'Gold rings') && prefOn(settings.prefs, 'goldRings')}
                goldCount={ringGold}
                chain={rings.perfect ? (playing?.kind === 'perfect' ? 'draw' : 'still') : undefined}
                spin={ringSpin + (playing?.kind === 'perfect' ? playing.id : 0)}
                play={ringPlay}
                onTap={() => {
                  setRingSpin((n) => n + 1);
                  setRingPlay((n) => n + 1);
                }}
              />
            </div>
          }
          onLogFood={() => go('/food')}
          onLogSleep={() => openSheet('morning')}
          onSaveSteps={(n) => void setSteps(today, n)}
          showCopyHint={logMinutes(nowMs) >= 19 * 60}
        />
      }
      moment={<>
        <MomentCard
          sheen={playing?.kind === 'perfect'}
          kind={nextKind}
          data={{
            closedRings: rings.closed,
            ringsOf: rings.of,
            proteinGapG: gap.gapG,
            gapFoods: gap.picks.map((p) => p.name).join(' and '),
            addLabel: `${gap.picks.length === 1 ? 'Add it' : gap.picks.length === 2 ? 'Add both' : 'Add them'} · ${Math.round(gap.picks.reduce((n, p) => n + p.proteinG, 0))} g`,
            stepsLeft: Math.max(0, stepsLeft),
            laps: loop ? fmtInt(Math.ceil(Math.max(stepsLeft, 0) / loop)) : undefined,
            easedTo: totals.eased ? stepsGoal(targets, true) : undefined,
            food: { meal: MEAL_NAMES[mealNow], usual: usual.slice(0, 2).map((u) => u.food.name).join(', '), logged: !!perMeal[mealNow] },
          }}
          actions={{ logMorning: () => openSheet('morning'), closeDay: () => go('/close'), toClose: () => document.querySelector('.td-handle')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), addGap, typeSteps: () => openSheet('steps'), addFood: () => openSheet('addfood', { meal: mealNow }) }}
        />
        {weighRow && (
          <div className="k-panel flat td-weighrow" style={{ '--ink': 'var(--k-pearl)' } as React.CSSProperties}>
            <span><b>Weigh-in to come</b> <span className="k-q">The rest of the morning log is saved.</span></span>
            <button type="button" className="k-act sm quiet" onClick={() => openSheet('morning')}>Add it</button>
          </div>
        )}
      </>}
      football={<Suspense fallback={null}><MatchToday now={nowMs} /></Suspense>}
      next={recordsTonight.length ? (
        <RecordsStrip rows={recordGains(recordsTonight, sets)} onFinale={() => { const tn = tonight(sessions, sets, today); if (tn) go('/session/replay', { id: tn.session.id }); }} />
      ) : undefined}
      shape={<Suspense fallback={null}><MatchToday now={nowMs} part="shape" /></Suspense>}
      meals={<MealsPanel meals={MEALS.map((m) => ({ meal: m, kcal: perMeal[m]?.kcal, protein: perMeal[m]?.protein, canRepeat: sameAsYesterday(monthEntries, m, today, 0).length > 0 }))} kcalAim={targets.kcalMax} proteinAim={targets.proteinG} onOpen={(m) => go('/food', { meal: m })} onRepeat={(m) => void repeat(m)} />}
      log={
        <section className="td-log" data-section="log" aria-label="Log">
          <LogBuckets
            b={{
              food: { kcal: totals.kcal, aim: targets.kcalMax },
              morning: { at: day?.morning?.at },
              checklist: { done: slots.filter((x) => day?.ticks?.[x.key] !== undefined).length, of: slots.length },
              steps: { n: day?.steps, of: stepsGoal(targets, totals.eased) },
              session: up || trainedToday.length ? { name: trainedToday.length ? findSession(settings.plan!, trainedToday[0].session)?.name ?? 'Session' : sessionName, done: trainedToday.length > 0 } : undefined,
            }}
            on={{ food: () => go('/food'), morning: () => openSheet('morning'), checklist: () => document.getElementById('td-panel-checklist')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), steps: () => openSheet('steps'), session: () => go('/train'), more: () => openSheet('more') }}
          />
          <LogSearch foods={foods} onAction={(a) => (a.sheet ? openSheet(a.sheet) : go(a.route!))} onFood={(f) => openSheet('addfood', { food: f.id })} onQuick={() => openSheet('quick')} />
          {slots.length > 0 && (
            <>
              <ChecklistPanel items={slots.map((x) => ({ key: x.key, name: slots.filter((y) => y.itemId === x.itemId).length > 1 ? `${x.name} · ${x.slot}` : x.name, on: day?.ticks?.[x.key] !== undefined, at: day?.ticks?.[x.key] }))} onToggle={(key, on) => { const slot = slots.find((y) => y.key === key)?.slot ?? 'Daily'; const t = tickFor(today, slot, settings, day, on, Date.now()); void setTick(today, key, on, t.at, t.recordedLate); }} />
              <p className="td-hint k-q">Press and hold an item to tick it. Hold a ticked one to untick it.</p>
            </>
          )}
        </section>
      }
      handle={<DrawerHandle closeLabel={day?.foodDone || day?.partial ? 'Day closed' : rings.perfect ? 'Close the day · Plated' : 'Close the day'} gold={rings.perfect && !day?.foodDone} onCloseDay={() => go('/close')} />}
    />
  );
}

/** The ring numbers keep each metric's own colour on every theme (look pass, rule 10): calories, protein, steps, sleep. */
/** Each number's place in a theme's four ring inks (board seven: the bars and numbers take the rings' colours). */
const INK_AT = { kcal: 0, protein: 1, steps: 2, sleep: 3 } as const;

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

