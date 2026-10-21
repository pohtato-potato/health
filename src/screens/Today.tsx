import { useMemo, useState } from 'react';
import { addDays, logHour, weekStart } from '../domain/dates';
import { fmtDuration, fmtInt, fmtTime } from '../domain/format';
import { findSession } from '../domain/plan';
import { sleepMinutes, stepsGoal } from '../domain/rings';
import { pinnedLine, voiceLine, plainFlagLine, type Moment } from '../domain/voice';
import { bump, setSteps } from '../db/actions';
import { useKonami } from '../ui/useKonami';
import { useActiveSession, useAllDays, useAllSets, useEntries, useEntriesBetween, useFoods, useSessions, useSettings, useToday } from '../db/hooks';
import { prefOn } from '../domain/types';
import { voiceFor } from '../domain/voice';
import { kmFromSteps, positionAt } from '../domain/walk';
import { landmarkFor } from '../walk/art/landmarks';
import { walkCaption } from '../domain/walkCaption';
import { WalkTop } from './today/WalkTop';
import { RingsNumbers } from './today/RingsNumbers';
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
import { Icon } from '../ui/Icon';
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
import { heldBackBy, readinessInk, readinessText } from '../domain/readiness';
import { SeasonStrip, useUnlockedIds } from '../ui/Theme';
import { hasReward } from '../domain/rewards';
import { NextUpCard } from './NextUpCard';
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
  const voiceNow = moment === 'perfect' || moment === 'proteinClosed';
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
  return (
    <>
    {walkOpen && <WalkFull scene={<WalkScene km={walkKm} dayN={dayN} caption={false} hero festive={festive} />} caption={caption} settings={settings} today={today} day={day} onClose={() => setWalkOpen(false)} />}
    <div className="page td-page">
      <h1 className="sr-only">Today</h1>
      <WalkTop caption={caption} scene={scene} onOpen={() => setWalkOpen(true)} />

      <TodayLine text={lineText} kind={lineKind} gold={moment === 'perfect'} clock={fmtTime(Date.now())} why={themeDay ? { name: themeDay.name, text: themeDay.why } : undefined} />

      <SeasonStrip settings={settings} today={today} />

      <Banners />

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

      <NextUpCard settings={settings} up={up} active={active} trainedToday={trainedToday} weeks={weeks} />

      <button type="button" className="card ready-card" onClick={() => go('/readiness')}>
        <span className="col" style={{ alignItems: 'center', minWidth: 64 }}>
          <span className="serif tn" style={{ fontSize: 34, lineHeight: 1, color: ready.known ? readinessInk(ready.score) : 'var(--quiet)' }}>
            {readinessText(ready)}
          </span>
          <span className="t12 q">{ready.known ? 'ready' : 'log sleep'}</span>
        </span>
        <span className="col gap4 grow">
          {ready.known ? (
            // A low score leads with what is holding it back.
            (heldBackBy(ready).length ? [...heldBackBy(ready), ...ready.parts.filter((p) => !heldBackBy(ready).includes(p)).sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))] : [...ready.parts].sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta)))
              .slice(0, 3)
              .map((pt) => (
                <span key={pt.key} className="row t13">
                  <span>{pt.label}</span>
                  <span className="tn" style={{ color: pt.delta > 0 ? 'var(--sage)' : 'var(--rose)' }}>
                    {pt.delta > 0 ? '+' : '−'}
                    {Math.abs(pt.delta)}
                  </span>
                </span>
              ))
          ) : (
            <span className="t13 q lh">Not enough data yet. The morning log's sleep makes this a real score.</span>
          )}
        </span>
      </button>

      {gap.mode === 'gap' && gap.picks.length > 0 && (
        <div className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <span className="col gap2 grow">
            <span className="t15">
              <span className="tn" style={{ color: 'var(--protein)' }}>{gap.gapG} g</span> protein to go
            </span>
            <span className="t13 q lh">{gap.picks.map((p) => p.name).join(' and ')}</span>
          </span>
          <button type="button" className="btn sm" onClick={addGap}>
            + {gap.picks.length === 1 ? 'Add it' : gap.picks.length === 2 ? 'Add both' : 'Add them'}
          </button>
        </div>
      )}

      <button type="button" className={`card${gap.mode === 'close' ? ' gold' : ''}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }} onClick={() => go('/close')}>
        <Icon name="check" size={22} color={gap.mode === 'close' ? 'var(--gold)' : 'var(--quiet)'} />
        <span className="col gap2 grow" style={{ textAlign: 'left' }}>
          <span className="t16">{day?.foodDone ? 'Day closed' : 'Close the day'}</span>
          <span className="t13 q">{day?.foodDone ? 'Tap to change anything' : gap.mode === 'close' ? "It's late. Check meals, checklist and steps, then mark it complete." : 'Meals, checklist and steps on one screen'}</span>
        </span>
        <Icon name="right" size={16} stroke={1.8} color="var(--dim)" />
      </button>
    </div>
    </>
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

