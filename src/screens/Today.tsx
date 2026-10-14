import { useMemo, useState } from 'react';
import { addDays, logHour, weekStart } from '../domain/dates';
import { fmtDayShort, fmtDuration, fmtInt } from '../domain/format';
import { findSession } from '../domain/plan';
import { sleepMinutes, stepsGoal } from '../domain/rings';
import { type Day, type Settings } from '../domain/types';
import { pinnedLine, voiceLine, plainFlagLine, type Moment } from '../domain/voice';
import { addEntries, bump, changePlace, deleteEntry } from '../db/actions';
import { useKonami } from '../ui/useKonami';
import { useActiveSession, useAllDays, useAllSets, useEntries, useEntriesBetween, useFoods, useMeasurements, useSessions, useSettings, useToday } from '../db/hooks';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Ticker, tickerContext } from '../ui/Ticker';
import { prefOn } from '../domain/types';
import { voiceFor } from '../domain/voice';
import { mealForTime, portionFor } from '../domain/foods';
import { kmFromSteps } from '../domain/walk';
import { placeFor } from '../domain/places';
import { proteinGap, stepTopUp } from '../domain/proteinGap';
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
import { forecastData } from '../state/forecastData';
import { readinessInk, readinessText } from '../domain/readiness';
import { OccasionCard } from '../sheets/Occasion';
import { SeasonStrip, useUnlockedIds } from '../ui/Theme';
import { hasReward } from '../domain/rewards';
import { NextUpCard } from './NextUpCard';
import { regionAt } from '../domain/regions';
import { themeDayOn } from '../domain/calendar';
import { ThemedRings } from '../ui/rings/ThemedRings';
import { daysBetween } from '../domain/dates';
import { journeyStart as journeyStartOf } from './Journey';
import { PlaceIcon } from '../ui/PlaceIcon';
import { STATUSES, StatusRow } from '../ui/StatusRow';
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
  const measurements = useMeasurements();
  const unlockedCount = useLiveQuery(() => db.achievements.count(), []);
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
  const topUp = stepTopUp({ steps: totals.steps, goal: stepsGoal(targets, totals.eased), eased: !!totals.eased }, Date.now());
  const gap = proteinGap({ protein: totals.protein, proteinTarget: targets.proteinG, kcal: totals.kcal, kcalMax: targets.kcalMax }, foods, monthEntries, Date.now());
  const addGap = async () => {
    const at = Date.now();
    const meal = mealForTime();
    const byId = new Map(foods.map((f) => [f.id, f]));
    const added = await addEntries(
      gap.picks.map((p) => {
        const f = byId.get(p.foodId)!;
        return { date: today, meal, at, kind: 'food' as const, foodId: f.id, name: f.name, amount: p.amount, portion: portionFor(f, p.amount), kcal: p.kcal, protein: p.proteinG };
      }),
    );
    toast({ text: `Added ${added.map((e) => e.name).join(' and ')}`, sub: `+${Math.round(gap.picks.reduce((n, p) => n + p.proteinG, 0))} g protein`, action: { label: 'Undo', run: () => added.forEach((e) => void deleteEntry(e.id)) } });
  };
  const ticker = prefOn(settings.prefs, 'ticker');
  const ready = forecastData(settings, today, days, monthEntries.filter((e) => e.date >= addDays(today, -2)), sessions, sets).readiness;
  // As in v1: the calorie and protein rings open meal logging, steps opens steps logging.
  const ringRow = (dot: string, value: string, unit: string, right: string, open: () => void) => (
    <button
      type="button"
      className="ring-row"
      onClick={(e) => {
        e.stopPropagation();
        open();
      }}
    >
      <i style={{ background: dot }} />
      <b className="serif tn">{value}</b>
      <span className="t13 q">{unit}</span>
      <span className="t12 q grow right tn">{right}</span>
    </button>
  );
  return (
    <>
    {ticker && <Ticker ctx={tickerContext(settings, today, days, monthEntries, sessions, sets, measurements, unlockedCount ?? 0)} />}
    <div className={`page${ticker ? ' after-ticker' : ''}`}>
      <div className="row base">
        <h1 className="t14" style={{ margin: 0, fontWeight: 600 }}>
          {fmtDayShort(today)}
        </h1>
        <PlaceChip settings={settings} today={today} day={day} />
      </div>

      <WalkScene km={walkKm} dayN={daysBetween(journeyStartOf(settings, days), today) + 1} festive={prefOn(settings.prefs, 'seasonal') ? seasonalThemeOn(today, settings.birthday) as Festive | undefined : undefined} />

      <div className="voice" style={flag ? { fontStyle: 'normal', fontFamily: 'var(--sans)', fontSize: 15, color: 'var(--apricot)' } : undefined}>
        {flag ? line : lineForTheDay(today, moment, line)}
      </div>

      {themeDay && (
        <div className="card">
          <div className="lbl gold">Why today · {themeDay.name}</div>
          <div className="t14 lh">{themeDay.why}</div>
        </div>
      )}

      <SeasonStrip settings={settings} today={today} />

      <Banners />

      <div className="card rings-card" style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <div role="button" tabIndex={0} aria-label="Log food" onClick={() => go('/food')} onKeyDown={(e) => e.key === 'Enter' && go('/food')} onPointerDown={konami.onPointerDown} onPointerUp={konami.onPointerUp} onClickCapture={konami.onClickCapture} style={konami.style}>
          {themeDay ? (
            <ThemedRings style={themeDay.ring} progress={[rings.kcal.progress, rings.protein.progress, rings.steps.progress]} label={`Rings for ${themeDay.name}: ${rings.closed} of 3 closed`} center={`${rings.closed}/3`} />
          ) : (
            <Rings
              progress={[rings.kcal.progress, rings.protein.progress, rings.steps.progress]}
              label={`Rings: ${rings.closed} of 3 closed`}
              gold={!!unlocked && hasReward(unlocked, 'Gold rings') && prefOn(settings.prefs, 'goldRings')}
              center={`${rings.closed}/3`}
            />
          )}
        </div>
        <div className="grow col gap6">
          {ringRow('var(--kcal)', fmtInt(totals.kcal), 'kcal', `${fmtInt(targets.kcalMin)}–${fmtInt(targets.kcalMax)}`, () => go('/food'))}
          {ringRow('var(--protein)', `${Math.round(totals.protein)} g`, 'protein', `of ${targets.proteinG}`, () => go('/food'))}
          {ringRow('var(--steps)', day?.steps !== undefined ? fmtInt(totals.steps) : '—', 'steps', `${totals.eased ? 'eased ' : 'of '}${fmtInt(stepsGoal(targets, totals.eased))}`, () => openSheet('steps'))}
          {topUp && <div className="t12 sage">{topUp}</div>}
        </div>
      </div>

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
            [...ready.parts]
              .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
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

      <OccasionCard settings={settings} today={today} />

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

/** "Office · change": where today is, with a tap to change it. Later in the day it records a move. */
function PlaceChip({ settings, today, day }: { settings: Settings; today: string; day: Day | undefined }) {
  const [open, setOpen] = useState(false);
  const places = settings.places?.length ? settings.places : [];
  const here = placeFor(day, settings, Date.now());
  if (!places.length) return null;
  const status = day?.status;
  return (
    <div className="col gap8" style={{ alignItems: 'flex-end' }}>
      <button type="button" className="place-chip" aria-expanded={open} onClick={() => setOpen(!open)}>
        <PlaceIcon place={here} size={14} /> {here.name}
        {status ? ` · ${STATUSES.find((x) => x.id === status)?.label.toLowerCase()}` : ''} · <span className="q">change</span>
      </button>
      {open && (
        <div className="panel col gap8" style={{ alignSelf: 'stretch' }}>
          <span className="lbl">Where now</span>
          <div className="row wrap" style={{ gap: 8, justifyContent: 'flex-start' }}>
            {places.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`chip sm${p.id === here.id ? ' on' : ''}`}
                aria-pressed={p.id === here.id}
                onClick={() => {
                  setOpen(false);
                  if (p.id !== here.id) void changePlace(today, p.id);
                }}
              >
                <PlaceIcon place={p} size={14} /> {p.name}
              </button>
            ))}
          </div>
          <span className="lbl">Status</span>
          <StatusRow today={today} current={status} />
        </div>
      )}
    </div>
  );
}
