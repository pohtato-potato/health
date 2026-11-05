import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useAllDays, useAllSets, useEntries, useSessions, useSettings, useSightings, useToday } from '../db/hooks';
import { creatureById, nameAt, noteAt, stageWord, tierWord, type Creature } from '../domain/creatureRoster';
import { maxStage, type Sighting } from '../domain/creatures';
import { addDays } from '../domain/dates';
import { fmt1, fmtDuration, fmtInt } from '../domain/format';
import { findSession } from '../domain/plan';
import { regionAt } from '../domain/regions';
import { sleepMinutes, stepsGoal } from '../domain/rings';
import { kmFromSteps, positionAt } from '../domain/walk';
import { themeDayOn } from '../domain/calendar';
import { back, go, useRoute } from '../router';
import { dayRings, nextUp } from '../state/derived';
import { ensureReveal } from '../state/reveal';
import { Aurora } from '../ui/live/Aurora';
import { CreatureFigure, CreatureSvg, StageDots } from '../ui/creatures/Figure';
import { auroraFor } from '../walk/page';
import '../styles/live.css';
import '../styles/creatures.css';

const skyOf = (c: Creature): CSSProperties => ({ '--lv-a': c.sky[0], '--lv-b': c.sky[1], '--lv-accent': c.sky[2] }) as CSSProperties;

function nightLine(min: number): string {
  if (min >= 480) return 'A long, slow night.';
  if (min >= 420) return 'A good night.';
  if (min >= 360) return 'Not quite a full night.';
  return 'A short night.';
}

export function growthWords(c: Creature, stage: number): string {
  if (c.tier === 'everyday') return stage >= 3 ? `Fully grown. Its theme day is yours now: ${c.theme?.name}.` : 'New markings have come in.';
  if (c.tier === 'medium') {
    if (stage >= 4) return `It has joined the sky. The ring style ${c.ring?.name} is yours now.`;
    return stage === 3 ? 'Fully seen at last, and now it has a name.' : 'A shape now, not just its tracks.';
  }
  return stage >= 3 ? `Every form found. The ring style ${c.ring?.name} is yours now.` : 'A new form, from its tales.';
}

interface Card {
  id: string;
  sky?: CSSProperties;
  body: ReactNode;
}

function VisitorBody({ c, s, label, visits }: { c: Creature; s: Pick<Sighting, 'stageAfter'>; label: string; visits: number }) {
  return (
    <>
      <span className="dawn-lab">{label}</span>
      <CreatureFigure c={c} stage={s.stageAfter} width={Math.min(260, window.innerWidth - 60)} />
      <h2 className="dawn-name" style={{ color: c.main }}>
        {nameAt(c, s.stageAfter)}
      </h2>
      <span className="dawn-tier" style={{ color: c.main }}>
        {tierWord(c)}
      </span>
      <StageDots c={c} stage={s.stageAfter} of={maxStage(c.tier)} word={stageWord(c, s.stageAfter)} />
      <p className="dawn-note">{noteAt(c, visits)}</p>
    </>
  );
}

function GrowthBody({ c, stage }: { c: Creature; stage: number }) {
  return (
    <>
      <span className="dawn-lab">Grew overnight</span>
      <div className="dawn-grow" aria-hidden="true">
        <CreatureSvg c={c} stage={stage - 1} className="dawn-old" />
        <CreatureSvg c={c} stage={stage} draw delay={1.2} />
      </div>
      <h2 className="dawn-name" style={{ color: c.main }}>
        {nameAt(c, stage)}
      </h2>
      <StageDots c={c} stage={stage} of={maxStage(c.tier)} word={stageWord(c, stage)} />
      <p className="dawn-note">{growthWords(c, stage)}</p>
    </>
  );
}

/** Sample visitors for checking the look in development. Nothing is saved. */
const DEV_VISITORS: Sighting[] = [
  { id: 'd1', date: 'dev', creatureId: 'nilgai', tier: 'everyday', stageAfter: 2, grew: true, why: 'night', at: 1 },
  { id: 'd2', date: 'dev', creatureId: 'cheetah', tier: 'medium', stageAfter: 1, grew: false, why: 'night', at: 2 },
  { id: 'd3', date: 'dev', creatureId: 'tanuki', tier: 'rare', stageAfter: 1, grew: false, why: 'perfect', at: 3 },
];

/** The morning reveal: tap to go on, one card at a time. Skip is always there, and the last card returns to Today. */
export function DawnPage() {
  const route = useRoute();
  const replayId = route.params.get('replay');
  const dev = import.meta.env.DEV && route.params.get('dev') === '1';
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  const sessions = useSessions();
  const sets = useAllSets();
  const yesterdayKey = addDays(today, -1);
  const entries = useEntries(yesterdayKey);
  const sightings = useSightings();
  const [visitors, setVisitors] = useState<Sighting[] | null>(dev ? DEV_VISITORS : null);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (replayId || dev) return;
    void ensureReveal(today).then(setVisitors);
  }, [today, replayId, dev]);

  const leave = () => (replayId ? back() : go('/today'));
  const ready = !!settings && !!days && !!sessions && !!sets && !!entries && !!sightings && (replayId || visitors);

  const cards = useMemo<Card[]>(() => {
    if (!ready || !settings || !days || !sessions || !sets || !entries || !sightings) return [];
    const visitsTo = (id: string, date: string) => sightings.filter((x) => x.creatureId === id && x.date <= date).length;
    if (replayId) {
      const c = creatureById(replayId);
      const last = sightings.filter((s) => s.creatureId === replayId).pop();
      return c && last ? [{ id: `replay-${c.id}`, sky: skyOf(c), body: <VisitorBody c={c} s={last} label={`Last seen ${last.date}`} visits={visitsTo(c.id, last.date)} /> }] : [];
    }
    const day = days.find((d) => d.date === today);
    const out: Card[] = [];
    const min = day?.sleep ? sleepMinutes(day.sleep.asleep, day.sleep.woke) : 0;
    out.push({
      id: 'night',
      body: (
        <>
          <span className="dawn-lab">Last night</span>
          <p className="dawn-big tn">{fmtDuration(min)}</p>
          <p className="dawn-note">{nightLine(min)}</p>
        </>
      ),
    });
    (visitors ?? []).forEach((s, n, all) => {
      const c = creatureById(s.creatureId);
      if (!c) return;
      const visits = dev ? s.stageAfter : visitsTo(c.id, s.date);
      const shownStage = s.grew ? s.stageAfter - 1 : s.stageAfter;
      out.push({ id: `visitor-${s.id}`, sky: skyOf(c), body: <VisitorBody c={c} s={{ stageAfter: shownStage }} label={`Visitor ${n + 1} of ${all.length}`} visits={visits} /> });
      if (s.grew) out.push({ id: `grew-${s.id}`, sky: skyOf(c), body: <GrowthBody c={c} stage={s.stageAfter} /> });
    });
    const y = days.find((d) => d.date === yesterdayKey);
    if (y?.steps !== undefined) {
      const km = kmFromSteps(y.steps);
      const total = kmFromSteps(days.reduce((n, d) => n + (d.steps ?? 0), 0));
      const pos = positionAt(total);
      out.push({
        id: 'walk',
        body: (
          <>
            <span className="dawn-lab">The walk</span>
            <p className="dawn-big tn">{fmt1(km)} km</p>
            <p className="dawn-note">Yesterday’s steps carried you that far. You’re past {pos.from.name}.</p>
          </>
        ),
      });
    }
    const { totals, rings, targets } = dayRings(settings, yesterdayKey, y, entries);
    out.push({
      id: 'rings',
      body: (
        <>
          <span className="dawn-lab">Yesterday’s rings</span>
          <div className="dawn-rows">
            <div className="dawn-row"><span>Calories</span><b className="tn">{fmtInt(totals.kcal)}</b></div>
            <div className="dawn-row"><span>Protein</span><b className="tn">{Math.round(totals.protein)} g</b></div>
            <div className="dawn-row"><span>Steps</span><b className="tn">{fmtInt(totals.steps)}</b></div>
          </div>
          <p className="dawn-note">{rings.closed} of 3 closed. The steps goal was {fmtInt(stepsGoal(targets, totals.eased))}.</p>
        </>
      ),
    });
    const km = kmFromSteps(days.reduce((n, d) => n + (d.steps ?? 0), 0));
    const worn = day?.theme ? creatureById(day.theme)?.theme : undefined;
    const theme = worn ?? themeDayOn(today, regionAt(km), { birthday: settings.birthday });
    const up = nextUp(settings, sessions, sets, days);
    const session = up && settings.plan ? findSession(settings.plan, up.sessionId)?.name : undefined;
    out.push({
      id: 'ahead',
      body: (
        <>
          <span className="dawn-lab">The day ahead</span>
          <h2 className="dawn-name">{theme ? theme.name : session ?? 'An open day'}</h2>
          <p className="dawn-note">{theme ? theme.why : session ? 'Next up on the plan.' : 'Nothing on the plan to get to.'}</p>
        </>
      ),
    });
    return out;
    // Only the first read counts: the cards don't shuffle if the day changes underneath them.
  }, [!!ready, visitors]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return <div className="dawn lv" style={auroraFor('plains') as CSSProperties}><Aurora /></div>;
  if (!cards.length) {
    leave();
    return null;
  }
  const km = days ? kmFromSteps(days.reduce((n, d) => n + (d.steps ?? 0), 0)) : 0;
  const card = cards[Math.min(i, cards.length - 1)];
  const last = i >= cards.length - 1;
  return (
    <div className="dawn lv" role="dialog" aria-label="The morning reveal" style={card.sky ?? (auroraFor(regionAt(km)) as CSSProperties)}>
      <Aurora />
      <div className="dawn-bar">
        <span className="dawn-pips" aria-hidden="true">
          {cards.map((c, k) => <i key={c.id} className={k <= i ? 'on' : ''} />)}
        </span>
        <span className="sr-only">Card {i + 1} of {cards.length}</span>
        {!last && (
          <button type="button" className="dawn-skip" onClick={leave}>
            Skip
          </button>
        )}
      </div>
      <div className="dawn-card" key={card.id} aria-live="polite" onClick={() => !last && setI(i + 1)}>
        {card.body}
      </div>
      <div className="dawn-foot">
        {last ? (
          <button type="button" className="btn lg block dawn-done" onClick={leave}>
            {replayId ? 'Done' : 'To today'}
          </button>
        ) : (
          <span>Tap to go on</span>
        )}
      </div>
    </div>
  );
}

