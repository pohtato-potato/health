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
import { clubById } from '../../football/data/load';
import { matchupShare, movedAxes, oppShape, threatLine, wentAhead } from '../../football/matchup';
import { loadTonight, type Tonight } from '../../football/store/hooks';
import { OWN } from '../../football/store/season';
import type { FbSave, StoredMatch } from '../../football/store/tables';
import { AXES, type Axis, type AxisValues } from '../../football/types';
import { go } from '../../router';
import { AXIS_INK, valueTier } from '../../ui/inks';
import { Radar } from '../football/Radar';
import { Art } from '../football/Tonight';
import '../../styles/football.css';

const BRABO_INK = '#ffb15e';
const name = (id: string) => (id === OWN ? 'Brabo United' : clubById(id).name);
// The club's first word reads better than its three-letter code at 360 px ("Sint-Anna", not "OS7").
const short = (id: string) => { if (id === OWN) return 'Brabo'; const n = clubById(id).name; const w = n.split(' ')[0]; return w.length >= 4 && w.length <= 12 ? w : clubById(id).short || n; };
const inkOf = (id: string) => (id === OWN ? BRABO_INK : brighten(clubById(id).colours?.[0] ?? '#ff8fa8'));
const crest = (save: FbSave, id: string, size: number) => (id === OWN ? crestSvg(save.crest.step, save.crest.opt, size) : clubCrest(clubById(id), size));

/** Club colours are often dark; on the night page each needs to read as text. */
function brighten(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  let [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255];
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (lum < 0.55) {
    const k = (0.62 - lum) / (1 - lum);
    [r, g, b] = [r, g, b].map((c) => Math.round(c + (255 - c) * k));
  }
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

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
    <section className="tm-match" style={{ '--t1': inkOf(m.home), '--t2': inkOf(m.away) } as React.CSSProperties} aria-label="The morning match">
      <p className="tm-lb">{m.round ?? 'League'} · {playedWhen(m, today)}</p>
      <div className="tm-duel">
        <figure><Art svg={crest(save, m.home, 56)} /><figcaption style={{ color: inkOf(m.home) }}>{name(m.home)}</figcaption></figure>
        <span className="tm-v" aria-hidden="true">v</span>
        <figure><Art svg={crest(save, m.away, 56)} /><figcaption style={{ color: inkOf(m.away) }}>{name(m.away)}</figcaption></figure>
      </div>
      <p className="tm-c">Last night’s shape is in. Watch it to see the score.</p>
      <button type="button" className="tm-watch" onClick={() => go('/football/match', { id: m.id })}>Watch the match</button>
      {more > 0 && <button type="button" className="tm-more" onClick={() => go('/football')}>{more === 1 ? 'One more match waits on Football' : `${more} more matches wait on Football`}</button>}
    </section>
  );
}

const WORD = { W: 'Won', D: 'Drew', L: 'Lost' } as const;

/** After the match is watched: the result row, using its full width (Today PM: no "closed" pill). */
export function ResultRow({ m, save, today }: { m: StoredMatch; save: FbSave; today: DayKey }) {
  const mine = m.score, opp = m.opp;
  const xg = m.events.xg;
  return (
    <button type="button" className={`tm-res r-${m.result}`} onClick={() => go('/football/match', { id: m.id })} aria-label={`${WORD[m.result]} ${mine[0]}–${mine[1]} against ${name(opp)}, ${m.round ?? 'League'}. Open the match`}>
      <span className="tm-wl" aria-hidden="true">{m.result}</span>
      <span className="tm-rs"><b>{WORD[m.result]} <span className="tn">{mine[0]}–{mine[1]}</span>{m.pens ? <small> ({m.pens[0]}–{m.pens[1]} pens)</small> : null}</b><span>{m.round ?? 'League'} · {playedWhen(m, today).replace('played ', '')}</span></span>
      <span className="tm-vs">
        <Art svg={crest(save, opp, 30)} />
        <span style={{ color: inkOf(opp) }}>{name(opp)}</span>
        <em>xG <i style={{ color: BRABO_INK }}>{xg[0].toFixed(1)}</i> – <i style={{ color: inkOf(opp) }}>{xg[1].toFixed(1)}</i></em>
      </span>
    </button>
  );
}

interface Fly { id: number; axis: Axis; delay: number }

/** Tonight's shape against the opponent: radar, threat line, matchup bar, the pull-ahead line and the moments. */
export function TonightShape({ t, stadium, buzzOn, reel }: { t: Tonight; stadium: boolean; buzzOn: boolean; reel: (axes: Axis[]) => void }) {
  const opp = t.oppTonight;
  const oppVals = useMemo(() => (opp ? oppShape(opp) : undefined), [opp]);
  const logged = Object.fromEntries(AXES.map((a) => [a, !t.flags[a]])) as Record<Axis, boolean>;
  const fog = AXES.filter((a) => t.flags[a] === 'no-data');
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
  const share = opp && oppVals ? matchupShare(t.liveValues, opp) : undefined;
  const threat = oppVals ? threatLine(oppId ? name(oppId) : 'They', oppVals, t.liveValues, logged) : undefined;
  const lead = ahead && oppVals && t.liveValues[ahead] > oppVals[ahead] ? ahead : undefined;
  const oppInk = oppId ? inkOf(oppId) : '#ff8fa8';
  return (
    <section className="tm-shape" aria-label="Tonight’s shape">
      <h2 className="tm-h">Tonight’s shape {oppId && <span className="tm-vsx">against <Art svg={clubCrest(clubById(oppId), 22)} /><b style={{ color: oppInk }}>{name(oppId)}</b></span>}</h2>
      <Radar values={t.liveValues} flags={t.flags} opp={oppVals} oppInk={oppInk} oppName={oppId ? name(oppId) : undefined} fog={fog} inked pulse={pulse} size={300} label="Tonight’s shape so far" />
      {threat && oppId && <p className="tm-ln"><b style={{ color: oppInk }}>{name(oppId)}</b> {threat.kind === 'strong' ? 'are strong on' : 'lead you on'} <b style={{ color: AXIS_INK[threat.axis] }}>{threat.axis}</b>. {threat.answer}</p>}
      {share !== undefined && oppId && (
        <div className="tm-bar" role="img" aria-label={`Matchup as it stands: you ${share}, ${name(oppId)} ${100 - share}`} style={{ '--t1': BRABO_INK, '--t2': oppInk } as React.CSSProperties}>
          <span className="tm-me" style={{ width: `${share}%` }}><b>You {share}</b></span>
          <span className="tm-op"><b>{100 - share} {short(oppId)}</b></span>
        </div>
      )}
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
      {fog.length > 0 && <p className="tm-ln"><b className="tm-fog">{fog.join(' and ')} {fog.length === 1 ? 'is' : 'are'} in fog.</b> Not enough history yet, so {fog.length === 1 ? 'it plays' : 'they play'} as an even 10.</p>}
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

/** The live block on Today: the morning match or its result, then tonight's shape. */
export function MatchToday({ now }: { now: number }) {
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
  const unwatched = recent.filter((m) => !m.watched && (m.home === OWN || m.away === OWN));
  const latest = recent.filter((m) => m.home === OWN || m.away === OWN).pop();
  const lead = unwatched[unwatched.length - 1];
  return (
    <>
      {lead ? <MorningMatch m={lead} save={t.save} today={date} more={unwatched.length - 1} /> : latest && latest.date === addDays(date, -1) ? <ResultRow m={latest} save={t.save} today={date} /> : null}
      <TonightShape t={t} stadium={prefOn(settings.prefs, 'stadium')} buzzOn={!!settings.prefs.buzz} reel={reel} />
      <FlyLayer flies={flies} />
    </>
  );
}
