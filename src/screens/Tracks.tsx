import { useEffect, type CSSProperties } from 'react';
import { bump } from '../db/actions';
import { dayKey } from '../domain/dates';
import { sleepMinutes } from '../domain/rings';
import { headlineFor, TRACK_KEYS, type TrackKey } from '../domain/trackRules';
import type { Settings } from '../domain/types';
import { back, go, useRoute } from '../router';
import { forecastData } from '../state/forecastData';
import { Icon } from '../ui/Icon';
import { Ambient } from '../ui/you/Ambient';
import { PageHead } from '../ui/kit/Kit';
import { Spark } from './you/MomentumChart';
import { CompareTrack } from './tracks/Compare';
import { foodByDay, headInput, spanDays, useTrackData } from './tracks/data';
import { DrinksTrack } from './tracks/Drinks';
import { FoodTrack } from './tracks/Food';
import { JointsTrack } from './tracks/Joints';
import { TRACK_LOOK } from './tracks/look';
import { Moved } from './reports/Moved';
import { ShapeTrack } from './tracks/Shape';
import { SleepTrack } from './tracks/Sleep';
import { StepsTrack } from './tracks/Steps';
import { TrainingTrack } from './tracks/Training';

type Kind = 'food' | 'shape' | 'steps' | 'sleep' | 'training' | 'readiness' | 'joints' | 'drinks' | 'own' | 'compare';

/** v1 links still land: weight and waist open Shape, calories and protein open Food. */
const LEGACY: Record<string, Kind> = { weight: 'shape', waist: 'shape', calories: 'food', protein: 'food', water: 'food' };

/** "Knee and wrist", from the plan's flag groups. */
export function jointsTitle(settings: Settings): string {
  const groups = [...new Set(settings.plan?.flags.map((f) => f.group) ?? [])];
  if (!groups.length) return 'Joints';
  const lower = groups.map((g, i) => (i ? g.toLowerCase() : g));
  return lower.length === 1 ? lower[0] : `${lower.slice(0, -1).join(', ')} and ${lower[lower.length - 1]}`;
}

/** The tracks on the list: readiness and custom tracks are retired (their data stays); joints only with a plan's flags. */
export function shownTracks(settings: Settings): TrackKey[] {
  return TRACK_KEYS.filter((k) => k !== 'readiness' && k !== 'own' && (k !== 'joints' || !!settings.plan?.flags.length));
}

/** You › Tracks: a tile per track on its own colour, with its sentence, a small line and its animation at low strength. */
export function Tracks() {
  const data = useTrackData();
  if (!data) return <div className="page bare k-page k-light you" />;
  const { settings, today } = data;
  const all = [...data.days.values()];
  const head = headInput(data);
  const readiness = forecastData(settings, today, all, data.entries, data.sessions, data.sets).readiness;
  const food = foodByDay(data.entries);
  const range = spanDays(today, '14');
  const series: Partial<Record<TrackKey, number[]>> = {
    food: range.flatMap((d) => (food.has(d) ? [food.get(d)!.protein] : [])),
    shape: range.flatMap((d) => { const w = data.days.get(d)?.weightKg; return w === undefined ? [] : [w]; }),
    steps: range.flatMap((d) => { const s = data.days.get(d)?.steps; return s === undefined ? [] : [s]; }),
    sleep: range.flatMap((d) => { const s = data.days.get(d)?.sleep; return s ? [sleepMinutes(s.asleep, s.woke)] : []; }),
  };
  // Readiness is retired (R3 x-ready): the body log on Today replaces it. Its stored data stays.
  // Custom tracks are retired too (R3 x-custom); their stored entries stay in backups.
  const keys = shownTracks(settings);
  // Look pass: a filled panel per track in its own ink, its sentence and its line; the tile's animation stays, faint.
  return (
    <div className="page bare k-page k-light you">
      <PageHead back="You" onBack={() => back('/you')} title="Tracks" />
      <div className="k-doors two k-track-tiles">
        {keys.map((k) => {
          const look = TRACK_LOOK[k];
          const say = headlineFor(k, { ...head, readiness, ownCount: 0 }).say;
          const line = series[k];
          const name = k === 'joints' ? jointsTitle(settings) : look.name;
          return (
            <button key={k} type="button" className="k-panel k-tap k-tt" style={{ '--ink': look.accent } as CSSProperties} onClick={() => (k === 'meds' ? go('/medicines') : go('/track', { k }))} aria-label={`${name}: ${say}`}>
              <Ambient t={k} />
              <span className="k-lb">{name}</span>
              <span className="k-tt-say">{say}</span>
              {line && line.length > 1 && <Spark vals={line} ink={look.accent} />}
              <Icon name="right" size={18} stroke={2.2} className="k-arrow" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** One Tracks page, by kind. */
export function TrackPage() {
  const { params } = useRoute();
  const raw = params.get('k') ?? 'steps';
  const kind: Kind = LEGACY[raw] ?? (raw as Kind);
  useEffect(() => {
    void bump('tracks', { value: `${dayKey()}|${kind}` });
  }, [kind]);
  const data = useTrackData();
  if (!data) return <div className="page bare" />;
  switch (kind) {
    case 'food':
      return <FoodTrack data={data} />;
    case 'shape':
      return <ShapeTrack data={data} />;
    case 'sleep':
      return <SleepTrack data={data} />;
    case 'training':
      return <TrainingTrack data={data} />;
    case 'joints':
      return <JointsTrack data={data} title={jointsTitle(data.settings)} />;
    case 'drinks':
      return <DrinksTrack data={data} />;
    case 'readiness':
      return <Moved to="/body" />;
    case 'own':
      return <Moved to="/tracks" />;
    case 'compare':
      return <CompareTrack data={data} />;
    default:
      return <StepsTrack data={data} />;
  }
}
