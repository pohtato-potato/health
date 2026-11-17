// Today's Football (release 1, pages rounds 3–5): the morning match leads the page with a Watch button; once it is
// watched, its result row takes the full width. Under it, tonight's shape fills in as you log, against the
// opponent's dashed shape, with their threat line, the live matchup bar and the pull-ahead line. Calories never
// appear here (R3 q-kcal). Each log flies to its axis; a log that takes an axis ahead plays the full moment.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { buzz, crowd } from '../../audio';
import { db } from '../../db/db';
import { useSettings } from '../../db/hooks';
import { addDays, dayOfLogging, type DayKey } from '../../domain/dates';
import { prefOn } from '../../domain/types';
import { clubCrest, crestSvg } from '../../football/art/crest';
import { clubById, tierName } from '../../football/data/load';
import { movedAxes, threatLine, wentAhead } from '../../football/matchup';
import { ChanceBar, lateFor, oppDrawing, useChances } from '../football/Chance';
import { loadTonight, type Tonight } from '../../football/store/hooks';
import { OWN } from '../../football/store/season';
import { storedGate } from '../../football/store/matchGate';
import type { FbSave, StoredMatch } from '../../football/store/tables';
import { AXES, type Axis, type AxisValues } from '../../football/types';
import { go } from '../../router';
import { AXIS_INK, brighten, valueTier } from '../../ui/inks';
import { Radar } from '../football/Radar';
import { Art, chanceFor } from '../football/Tonight';
import { paceSum, PaceSumView } from '../football/PaceSum';
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
 * After the match is watched (board five): one filled panel, tappable. Last night's result word and score in its
 * colour on the left; tonight's opponent, their crest and home or away on the right. It opens last night's match.
 */
export function ResultRow({ m, save, today, next }: { m: StoredMatch; save: FbSave; today: DayKey; next?: { opp: string; home: boolean; round?: string } }) {
  const mine = m.score, opp = m.opp;
  const xg = m.events.xg;
  const when = playedWhen(m, today).replace('played ', '');
  const right = next?.opp ? next.opp : opp;
  return (
    <button type="button" className={`k-panel k-tap flat tm-res r-${m.result}`} style={{ '--ink': '#ff9a4d' } as React.CSSProperties} onClick={() => go('/football/match', { id: m.id })}
      aria-label={`${WORD[m.result]} ${mine[0]}–${mine[1]} against ${name(opp)}, ${when}. xG ${xg[0].toFixed(1)} to ${xg[1].toFixed(1)}.${next?.opp ? ` Tonight: ${name(next.opp)}, ${next.home ? 'at home' : 'away'}.` : ''} Open the match`}>
      <span className="tm-rs">
        <b className="tm-score">{WORD[m.result]} <span className="tn">{mine[0]}–{mine[1]}</span>{m.pens ? <small> ({m.pens[0]}–{m.pens[1]} pens)</small> : null}</b>
        <span className="k-q">{when === 'this morning' ? 'last night' : when}</span>
      </span>
      <span className="tm-crest" aria-hidden="true"><Art svg={crest(save, right, 34)} /></span>
      <span className="tm-vs">
        <b style={{ color: inkOf(right) }}>{name(right)}</b>
        <span className="k-q">{next?.opp ? `tonight, ${next.home ? 'home' : 'away'}` : `last night · ${m.round ?? 'League'}`}</span>
      </span>
      <svg className="k-arrow" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );
}

interface Fly { id: number; axis: Axis; delay: number }

/** Tonight's shape against the opponent: radar, threat line, matchup bar, the pull-ahead line and the moments. */
export function TonightShape({ t, stadium, buzzOn, reel }: { t: Tonight; stadium: boolean; buzzOn: boolean; reel: (axes: Axis[]) => void }) {
  const opp = t.oppTonight;
  const chances = useChances(t.date);
  const chance = chances === undefined ? undefined : chances[0] ?? null;
  const late = lateFor(t.date);
  const oppVals = useMemo(() => oppDrawing(opp, t.liveValues, chance, late), [opp, t.liveValues, chance, late]);
  const logged = Object.fromEntries(AXES.map((a) => [a, !t.flags[a]])) as Record<Axis, boolean>;
  // Fog of war: an axis with no data, or not logged yet, is hatched with "?" (q-pg-fog A); unlogged ones play low.
  const fog = AXES.filter((a) => t.flags[a]);
  const noData = fog.filter((a) => t.flags[a] === 'no-data'), unlogged = fog.filter((a) => t.flags[a] === 'not-logged');
  const prev = useRef<{ date: DayKey; v: AxisValues } | null>(null);
  const [ahead, setAhead] = useState<Axis | undefined>(() => readAhead(t.date));
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
  const threat = oppVals ? threatLine(oppId ? name(oppId) : 'They', oppVals, t.liveValues, logged) : undefined;
  const lead = ahead && oppVals && t.liveValues[ahead] > oppVals[ahead] ? ahead : undefined;
  const oppInk = oppId ? inkOf(oppId) : '#ff8fa8';
  return (
    <section className="tm-shape" aria-label="Tonight’s shape">
      <h2 className="k-sect tm-h">Tonight’s shape</h2>
      {oppId && <p className="tm-vsx">against <Art svg={clubCrest(clubById(oppId), 22)} /><b style={{ color: oppInk }}>{name(oppId)}</b></p>}
      {oppId && t.oppTier && t.braboTier && (f.comp !== 'league' || t.oppTier !== t.braboTier) && <p className="tm-ln">{f.round ?? 'A cup tie'}: {name(oppId)} play in {t.oppTier === t.braboTier ? 'your division' : tierName(t.oppTier)}{t.oppTier < t.braboTier ? `, ${t.braboTier - t.oppTier === 1 ? 'one division' : `${t.braboTier - t.oppTier} divisions`} above you` : ''}.</p>}
      <Radar values={t.liveValues} flags={t.flags} opp={oppVals} oppInk={oppInk} oppName={oppId ? name(oppId) : undefined} fog={fog} inked pulse={pulse} size={300} label="Tonight’s shape so far" motionId={`today-radar:${t.date}`} />
      {paceSum(t) && <PaceSumView p={paceSum(t)!} />}
      {threat && oppId && <p className="tm-ln"><b style={{ color: oppInk }}>{name(oppId)}</b> {threat.kind === 'strong' ? 'are strong on' : 'lead you on'} <b style={{ color: AXIS_INK[threat.axis] }}>{threat.axis}</b>. {threat.answer}</p>}
      {t.fixtures.length > 1 ? (
        <div className="tm-night">
          <h3 className="tm-h">{t.fixtures.length === 2 ? 'Two' : t.fixtures.length} matches tonight</h3>
          {t.fixtures.map((x, i) => {
            const c = chanceFor(x, chances ?? []);
            return (
              <div key={`${x.comp}:${x.opp}:${i}`} className="tm-nf">
                <p className="tm-vsx">{x.opp ? <><Art svg={clubCrest(clubById(x.opp), 22)} /><b style={{ color: inkOf(x.opp) }}>{name(x.opp)}</b></> : <b>Drawn on the night</b>}</p>
                <p className="tm-ln">{x.round ?? x.label}{x.opp ? ` · ${x.braboHome ? 'home' : 'away'}` : ''}</p>
                {c && x.opp && <ChanceBar c={c} oppName={short(x.opp)} oppId={x.opp} date={t.date} values={t.liveValues} />}
              </div>
            );
          })}
          <p className="tm-ln">One shape plays {t.fixtures.length === 2 ? 'both' : 'them all'}. Each has its own chance.</p>
        </div>
      ) : chance && oppId && <ChanceBar c={chance} oppName={short(oppId)} oppId={oppId} date={t.date} values={t.liveValues} />}
      {lead && oppVals && oppId && (
        <div className="tm-ahead">
          <p className="tm-at"><b style={{ color: AXIS_INK[lead] }}>{lead}</b><span>takes you ahead</span></p>
          <p className="tm-cv"><span>You <b className={`tn ${valueTier(t.liveValues[lead])}`}>{t.liveValues[lead]}</b></span><span>{short(oppId)} <b className={`tn ${valueTier(oppVals[lead])}`}>{oppVals[lead]}</b></span></p>
        </div>
      )}
      {t.respond && <p className="tm-ln"><b className="tm-back">The dressing room responds.</b> After last night’s defeat, +1 tonight on <b style={{ color: AXIS_INK[t.respond] }}>{t.respond}</b>.</p>}
      {t.lowLog && <p className="tm-ln"><b className="tm-back">Low-log week.</b> Medicines and <b style={{ color: AXIS_INK[t.lowLog] }}>{t.lowLog}</b> are all that’s needed; the rest plays at your typical level.</p>}
      {(['Power', 'Pace'] as const).some((a) => t.condition[a] < 80) && (
        <p className="tm-ln"><b>Squad condition:</b> {(['Power', 'Pace'] as const).filter((a) => t.condition[a] < 80).map((a) => `${a} ${t.condition[a]}%`).join(', ')}. Low condition lowers tonight’s ceiling, never your logged numbers. Rest and a full night refill it.</p>
      )}
      {t.comeback && <p className="tm-ln"><b className="tm-back">Comeback lift.</b> A full day after a gap: +1 tonight on your weakest logged axis.</p>}
      {noData.length > 0 && <p className="tm-ln"><b className="tm-fog">{noData.join(' and ')} {noData.length === 1 ? 'is' : 'are'} in fog.</b> No data, so {noData.length === 1 ? 'it plays' : 'they play'} as an even 10.</p>}
      {unlogged.length > 0 && <p className="tm-ln"><b className="tm-fog">{unlogged.join(' and ')} {unlogged.length === 1 ? 'is' : 'are'} not logged yet.</b> Left in fog, {unlogged.length === 1 ? 'it plays' : 'they play'} low and unpredictable tonight.</p>}
      {moment && oppVals && oppId && (
        <button type="button" className="tm-moment" key={moment.id} style={{ '--ax': AXIS_INK[moment.axis] } as React.CSSProperties} onClick={() => setMoment(null)} aria-live="assertive">
          <span className="tm-burst" aria-hidden="true" />
          <b>{moment.axis} takes you ahead</b>
          <span className="tm-cv"><span>You <b className={`tn ${valueTier(t.liveValues[moment.axis])}`}>{t.liveValues[moment.axis]}</b></span><span>{short(oppId)} <b className={`tn ${valueTier(oppVals[moment.axis])}`}>{oppVals[moment.axis]}</b></span></span>
          <small>Tap to carry on</small>
        </button>
      )}
    </section>
  );
}

/** Logs flying to their axis: a bright dot runs from the bottom of the screen to each moved axis, one after another (the batch reel). */
function FlyLayer({ flies }: { flies: Fly[] }) {
  const [at, setAt] = useState<Record<number, { x: number; y: number }>>({});
  useEffect(() => {
    const next: Record<number, { x: number; y: number }> = {};
    for (const f of flies) {
      const el = document.querySelector(`.tm-shape .lab[data-axis="${f.axis}"]`) ?? document.querySelector('.tm-shape');
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
    return { t, recent: recent.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)) };
  }, [date]);
  const [flies, setFlies] = useState<Fly[]>([]);
  const reel = (axes: Axis[]) => {
    const base = Date.now();
    setFlies(axes.map((axis, i) => ({ id: base + i, axis, delay: i * 420 })));
    window.setTimeout(() => setFlies([]), 900 + axes.length * 420);
  };
  if (!got?.t || !settings) return null;
  const { t, recent } = got;
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
  return lead ? <MorningMatch m={lead} save={t.save} today={date} more={unwatched.length - 1} /> : latest && latest.date === addDays(date, -1) ? <ResultRow m={latest} save={t.save} today={date} next={f?.opp ? { opp: f.opp, home: f.braboHome, round: f.round } : undefined} /> : null;
}
