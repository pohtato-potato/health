// Today's Football (release 1, pages rounds 3–5): the morning match leads the page with a Watch button; once it is
// watched, its result row takes the full width. Under it, tonight's shape fills in as you log, against the
// opponent's dashed shape, with their threat line, the live matchup bar and the pull-ahead line. Calories never
// appear here (R3 q-kcal). Each log flies to its axis; a log that takes an axis ahead plays the full moment.
import { useMarkMatchNight } from '../../ui/motion/matchNight';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { buzz, crowd } from '../../audio';
import { db } from '../../db/db';
import { useSettings } from '../../db/hooks';
import { addDays, dayOfLogging, type DayKey } from '../../domain/dates';
import { prefOn } from '../../domain/types';
import { clubCrest, crestSvg } from '../../football/art/crest';
import { clubById } from '../../football/data/load';
import { movedAxes, wentAhead } from '../../football/matchup';
import { DRAW_INK, lateFor, lossInkOf, oppDrawing, shownChance, useChances } from '../football/Chance';
import { chancePercents } from '../../football/chance';
import { TodayPanel } from './TodayLayout';
import { loadTonight, type Tonight } from '../../football/store/hooks';
import { OWN } from '../../football/store/season';
import { storedGate } from '../../football/store/matchGate';
import type { FbSave, StoredMatch } from '../../football/store/tables';
import { AXES, type Axis, type AxisValues } from '../../football/types';
import { go } from '../../router';
import { AXIS_INK, brighten, valueTier } from '../../ui/inks';
import { Radar } from '../football/Radar';
import { Art } from '../football/Tonight';
import { ordinal } from '../../football/habitLines';
import { position, standings } from '../../football/table';
import '../../styles/football.css';

const BRABO_INK = '#ffb15e';
const name = (id: string) => (id === OWN ? 'Brabo United' : clubById(id).name);
// The club's first word reads better than its three-letter code at 360 px ("Sint-Anna", not "OS7").
const short = (id: string) => { if (id === OWN) return 'Brabo'; const n = clubById(id).name; const w = n.split(' ')[0]; return w.length >= 4 && w.length <= 12 ? w : clubById(id).short || n; };
const inkOf = (id: string) => (id === OWN ? BRABO_INK : brighten(clubById(id).colours?.[0] ?? '#ff8fa8'));
const crest = (save: FbSave, id: string, size: number) => (id === OWN ? crestSvg(save.crest.step, save.crest.opt, size) : clubCrest(clubById(id), size));

const AHEAD_KEY = 'health.ahead';
function readAhead(date: DayKey): Axis | undefined {
  try {
    const v = JSON.parse(localStorage.getItem(AHEAD_KEY) ?? 'null') as { date: string; axis: Axis } | null;
    return v?.date === date ? v.axis : undefined;
  } catch {
    return undefined;
  }
}
function keepAhead(date: DayKey, axis: Axis) {
  try {
    localStorage.setItem(AHEAD_KEY, JSON.stringify({ date, axis }));
  } catch {
    /* the line simply isn't remembered */
  }
}

function playedWhen(m: StoredMatch, today: DayKey): string {
  if (m.date === addDays(today, -1)) return 'played this morning';
  return `played ${new Date(`${m.date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long' })}`;
}

/** The morning match, before it's watched: the two crests and one button. The score stays hidden (R3 q-reveal). */
export function MorningMatch({ m, save, today, more }: { m: StoredMatch; save: FbSave; today: DayKey; more: number }) {
  return (
    <section className="k-panel tm-match" style={{ '--t1': inkOf(m.home), '--t2': inkOf(m.away) } as React.CSSProperties} aria-label="The morning match">
      <p className="tm-lb">{m.round ?? 'League'} · {playedWhen(m, today)}</p>
      <div className="tm-duel">
        <figure><Art svg={crest(save, m.home, 56)} /><figcaption style={{ color: inkOf(m.home) }}>{name(m.home)}</figcaption></figure>
        <span className="tm-v" aria-hidden="true">v</span>
        <figure><Art svg={crest(save, m.away, 56)} /><figcaption style={{ color: inkOf(m.away) }}>{name(m.away)}</figcaption></figure>
      </div>
      <p className="tm-c">Last night’s shape is in. Watch it to see the score.</p>
      <button type="button" className="tm-watch" onClick={() => storedGate.watch(m)}>Watch the match</button>
      {/* Matchday §4 (choice D a): Skip shows the score of a match the assistant finished, without the replay. */}
      <button type="button" className="tm-more" onClick={() => void storedGate.skipNight(m)}>Skip to the result</button>
      {more > 0 && <button type="button" className="tm-more" onClick={() => go('/football')}>{more === 1 ? 'One more match waits on Football' : `${more} more matches wait on Football`}</button>}
    </section>
  );
}

const WORD = { W: 'Won', D: 'Drew', L: 'Lost' } as const;

/**
 * Which two of last night's parts decided it (board 8 `s8-win`): the two highest on a win or a draw, the two lowest
 * on a loss. Parts with no data are left out; nothing when fewer than two were played.
 */
export function carriedLine(m: Pick<StoredMatch, 'values' | 'flags' | 'result'>): string | undefined {
  if (!m.values) return undefined;
  const live = AXES.filter((a) => !m.flags?.[a] && Number.isFinite(m.values[a]));
  if (live.length < 2) return undefined;
  const sorted = [...live].sort((x, y) => (m.result === 'L' ? m.values[x] - m.values[y] : m.values[y] - m.values[x]));
  const two = `${sorted[0]} ${m.values[sorted[0]]} and ${sorted[1]} ${m.values[sorted[1]]}`;
  return m.result === 'W' ? `${two} carried it` : m.result === 'D' ? `${two} held it level` : `${two} let it slip`;
}

const PTS = { W: 3, D: 1, L: 0 } as const;

/**
 * The morning after (board 8 `s8-win`), between Next and the meals: last night's result named in words, the score
 * large between the two crests, which two parts carried it, and in the league the points and the place. The score
 * opens last night's match; tonight's opponent sits under it.
 */
export function ResultRow({ m, save, today, next, pos }: { m: StoredMatch; save: FbSave; today: DayKey; next?: { opp: string; home: boolean; round?: string }; pos?: number }) {
  const mine = m.score;
  const when = playedWhen(m, today).replace('played ', '');
  const night = when === 'this morning' ? 'Last night' : when[0].toUpperCase() + when.slice(1);
  const carried = carriedLine(m);
  const table = m.comp === 'league' ? `+${PTS[m.result]} pt${PTS[m.result] === 1 ? '' : 's'}${pos ? ` · ${ordinal(pos)}` : ''}` : undefined;
  return (
    <section className={`k-panel flat tm-res r-${m.result}`} aria-labelledby="tm-res-h">
      <header className="tm-res-head">
        <h2 id="tm-res-h" className="tm-res-h">{night}</h2>
        <span className="tm-res-word">{WORD[m.result]}</span>
      </header>
      <button type="button" className="tm-res-main" onClick={() => go('/football/match', { id: m.id })}
        aria-label={`${WORD[m.result]} ${mine[0]}–${mine[1]} against ${name(m.opp)}${m.pens ? `, ${m.pens[0]}–${m.pens[1]} on penalties` : ''}. Open the match`}>
        <span className="tm-res-crest" aria-hidden="true"><Art svg={crest(save, OWN, 40)} /></span>
        <b className="tm-res-score tn">{mine[0]}–{mine[1]}</b>
        <span className="tm-res-crest" aria-hidden="true"><Art svg={crest(save, m.opp, 40)} /></span>
        <span className="tm-res-vs">{m.round ?? 'League'} · against <span style={{ color: inkOf(m.opp) }}>{name(m.opp)}</span>{m.pens ? ` · ${m.pens[0]}–${m.pens[1]} pens` : ''}</span>
      </button>
      {(carried || table) && (
        <div className="tm-res-foot">
          {carried && <span className="tm-res-why">{carried}</span>}
          {table && <span className="tm-res-pts">{table}</span>}
        </div>
      )}
      {next?.opp && <p className="tm-res-next">Tonight: {name(next.opp)}, {next.home ? 'at home' : 'away'}</p>}
    </section>
  );
}

interface Fly { id: number; axis: Axis; delay: number }

/** Tonight's shape against the opponent: radar, threat line, matchup bar, the pull-ahead line and the moments. */
export function TonightShape({ t, stadium, buzzOn, reel }: { t: Tonight; stadium: boolean; buzzOn: boolean; reel: (axes: Axis[]) => void }) {
  const opp = t.oppTonight;
  useMarkMatchNight(t.date, Boolean(t.fixture) && !t.played.length);
  const chances = useChances(t.date);
  const chance = chances === undefined ? undefined : chances[0] ?? null;
  const late = lateFor(t.date);
  const oppVals = useMemo(() => oppDrawing(opp, t.liveValues, chance, late), [opp, t.liveValues, chance, late]);
  // Fog of war: an axis with no data, or not logged yet, is hatched with "?" (q-pg-fog A); unlogged ones play low.
  const fog = AXES.filter((a) => t.flags[a]);
  const noData = fog.filter((a) => t.flags[a] === 'no-data'), unlogged = fog.filter((a) => t.flags[a] === 'not-logged');
  const prev = useRef<{ date: DayKey; v: AxisValues } | null>(null);
  const [, setAhead] = useState<Axis | undefined>(() => readAhead(t.date));
  const [moment, setMoment] = useState<{ axis: Axis; id: number } | null>(null);
  const [pulse, setPulse] = useState<{ axis: Axis; id: number } | undefined>();

  useEffect(() => {
    const before = prev.current;
    prev.current = { date: t.date, v: t.liveValues };
    if (!before || before.date !== t.date) return;
    const moved = movedAxes(before.v, t.liveValues);
    if (!moved.length) return;
    reel(moved);
    moved.forEach((a, i) => window.setTimeout(() => {
      setPulse({ axis: a, id: Date.now() + i });
      if (buzzOn) buzz(18);
    }, 700 + i * 420));
    if (!oppVals) return;
    const up = wentAhead(before.v, t.liveValues, oppVals);
    if (up.length) {
      const a = up[0];
      keepAhead(t.date, a);
      setAhead(a);
      window.setTimeout(() => {
        setMoment({ axis: a, id: Date.now() });
        if (buzzOn) buzz([40, 60, 90]);
        if (stadium) crowd();
      }, 700 + moved.length * 420);
    }
  }, [t.liveValues, t.date]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!moment) return;
    const h = window.setTimeout(() => setMoment(null), 3200);
    return () => window.clearTimeout(h);
  }, [moment]);

  const f = t.fixture;
  if (!f || t.morning.intl) return null;
  const oppId = f.opp;
  const oppInk = oppId ? inkOf(oppId) : '#ff8fa8';
  const pct = chance && oppId ? chancePercents(shownChance(chance, late).c) : undefined;
  const others = t.fixtures.slice(1);
  return (
    <MatchCard
      title={`${oppId ? name(oppId) : 'Drawn on the night'} (${f.braboHome ? 'H' : 'A'}) · 4 am`}
      pct={pct}
      inks={[BRABO_INK, DRAW_INK, lossInkOf(oppId)]}
      fogLine={fogLine(noData, unlogged)}
      notes={[
        others.length ? `Also tonight: ${others.map((x) => (x.opp ? name(x.opp) : x.round ?? x.label)).join(', ')}. One shape plays ${others.length === 1 ? 'both' : 'them all'}.` : '',
        t.respond ? `The dressing room responds: +1 tonight on ${t.respond}.` : '',
        t.comeback ? 'Comeback lift: +1 tonight on your weakest logged axis.' : '',
        t.lowLog ? `Low-log week: medicines and ${t.lowLog} are all that’s needed.` : '',
        (['Power', 'Pace'] as const).some((x) => t.condition[x] < 80) ? `Squad condition: ${(['Power', 'Pace'] as const).filter((x) => t.condition[x] < 80).map((x) => `${x} ${t.condition[x]}%`).join(', ')}.` : '',
      ].filter(Boolean)}
      radar={<Radar values={t.liveValues} flags={t.flags} opp={oppVals} oppInk={oppInk} oppName={oppId ? name(oppId) : undefined} fog={fog} inked pulse={pulse} size={300} label="Tonight’s shape so far" motionId={`today-radar:${t.date}`} />}
    >
      {moment && oppVals && oppId && (
        <button type="button" className="tm-moment" key={moment.id} style={{ '--ax': AXIS_INK[moment.axis] } as React.CSSProperties} onClick={() => setMoment(null)} aria-live="assertive">
          <span className="tm-burst" aria-hidden="true" />
          <b>{moment.axis} takes you ahead</b>
          <span className="tm-cv"><span>You <b className={`tn ${valueTier(t.liveValues[moment.axis])}`}>{t.liveValues[moment.axis]}</b></span><span>{short(oppId)} <b className={`tn ${valueTier(oppVals[moment.axis])}`}>{oppVals[moment.axis]}</b></span></span>
          <small>Tap to carry on</small>
        </button>
      )}
    </MatchCard>
  );
}

/** "Power in fog: no data", "Rest not logged yet": the shape's fog in one line. */
export function fogLine(noData: Axis[], unlogged: Axis[]): string | undefined {
  const parts = [noData.length ? `${noData.join(' and ')} in fog: no data` : '', unlogged.length ? `${unlogged.join(' and ')} not logged yet` : ''].filter(Boolean);
  return parts.length ? `${parts.join('. ')}.` : undefined;
}

/**
 * Tonight's match on Home (board 6 `h6-c`): one panel. The header names the opponent and kick-off with the win chance as
 * its chip; then win, draw and loss as numbers, the shape so far, and only the notes that change tonight.
 */
export function MatchCard({ title, pct, inks, fogLine: fl, notes, radar, children }: { title: string; pct?: [number, number, number]; inks: [string, string, string]; fogLine?: string; notes: string[]; radar: React.ReactNode; children?: React.ReactNode }) {
  return (
    <TodayPanel id="match" title={title} chip={pct ? `${pct[0]}% win` : undefined} chipInk={inks[0]} className="tm-card">
      {pct && (
        <div className="tm-pcts" role="group" aria-label={`Tonight’s chance: win ${pct[0]} in 100, draw ${pct[1]}, loss ${pct[2]}`}>
          {(['win', 'draw', 'loss'] as const).map((w, i) => (
            <span key={w} className="tm-pct" aria-hidden="true"><b className="tn" style={{ color: inks[i] }}>{pct[i]}%</b>{w}</span>
          ))}
        </div>
      )}
      <p className="tm-shapeh"><b>Tonight’s shape</b>{fl && <span> · {fl}</span>}</p>
      <div className="tm-radar">{radar}</div>
      {notes.map((n) => <p key={n} className="tm-note">{n}</p>)}
      {children}
    </TodayPanel>
  );
}

/** Logs flying to their axis: a bright dot runs from the bottom of the screen to each moved axis, one after another (the batch reel). */
function FlyLayer({ flies }: { flies: Fly[] }) {
  const [at, setAt] = useState<Record<number, { x: number; y: number }>>({});
  useEffect(() => {
    const next: Record<number, { x: number; y: number }> = {};
    for (const f of flies) {
      const el = document.querySelector(`.tm-card .lab[data-axis="${f.axis}"]`) ?? document.querySelector('.tm-card');
      const r = el?.getBoundingClientRect();
      if (r) next[f.id] = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    setAt(next);
  }, [flies]);
  return (
    <div className="tm-flies" aria-hidden="true">
      {flies.map((f) => at[f.id] && (
        <i key={f.id} className="tm-fly" style={{ '--ax': AXIS_INK[f.axis], '--tx': `${at[f.id].x}px`, '--ty': `${at[f.id].y}px`, animationDelay: `${f.delay}ms` } as React.CSSProperties} />
      ))}
    </div>
  );
}

/** Football on Today: `top` is the morning match or last night's result (first screen); `shape` is tonight's shape (scrolled). */
export function MatchToday({ now, part = 'top' }: { now: number; part?: 'top' | 'shape' }) {
  const date = dayOfLogging(now);
  const settings = useSettings();
  const got = useLiveQuery(async () => {
    const t = await loadTonight(date);
    if (!t) return null;
    const recent = await db.fbMatches.where('date').between(addDays(date, -60), date, true, false).toArray();
    // The league place after last night (s8-win), as the Football tab's league line works it out.
    const season = await db.fbSeasons.get(t.save.season);
    const tier = season?.tierOf[OWN];
    const pos = season && tier !== undefined ? position(standings(season.results[tier] ?? [], Object.keys(season.tierOf).filter((id) => season.tierOf[id] === tier), season.deductions), OWN) : undefined;
    return { t, pos: pos || undefined, recent: recent.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)) };
  }, [date]);
  const [flies, setFlies] = useState<Fly[]>([]);
  const reel = (axes: Axis[]) => {
    const base = Date.now();
    setFlies(axes.map((axis, i) => ({ id: base + i, axis, delay: i * 420 })));
    window.setTimeout(() => setFlies([]), 900 + axes.length * 420);
  };
  if (!got?.t || !settings) return null;
  const { t, recent, pos } = got;
  // Today only ever offers last night's matches (finding 2, O42); older ones live in the calendar.
  const unwatched = recent.filter((m) => !m.watched && (m.home === OWN || m.away === OWN) && m.date === addDays(date, -1));
  const latest = recent.filter((m) => m.home === OWN || m.away === OWN).pop();
  const lead = unwatched[unwatched.length - 1];
  if (part === 'shape') {
    return (
      <>
        <TonightShape t={t} stadium={prefOn(settings.prefs, 'stadium')} buzzOn={!!settings.prefs.buzz} reel={reel} />
        <FlyLayer flies={flies} />
      </>
    );
  }
  const f = t.fixture;
  return lead ? <MorningMatch m={lead} save={t.save} today={date} more={unwatched.length - 1} /> : latest && latest.date === addDays(date, -1) ? <ResultRow m={latest} save={t.save} today={date} pos={pos} next={f?.opp ? { opp: f.opp, home: f.braboHome, round: f.round } : undefined} /> : null;
}
