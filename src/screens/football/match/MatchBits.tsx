// Matchday depth (spec 2026-11-12 §3): the pieces the match screens share. The score with crests, the momentum strip,
// the shot map, the players in a move, the plan (before kick-off), the pick of three. Presentation only.
import { clubCrest, crestSvg } from '../../../football/art/crest';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { clubById } from '../../../football/data/load';
import { OWN } from '../../../football/store/season';
import { pickWords, TEMPO_NAME, TEMPOS, WIDTH_NAME, WIDTHS, type MatchdayPlan, type PickTile, type Read } from '../../../football/matchday';
import type { XiPlace } from '../../../football/players/types';
import { hashSeed } from '../../../football/rng';
import { TACTIC_NAME, TACTICS, tacticWords, type Tactic } from '../../../football/rotation/night';
import { choosePick, setPlan } from '../../../football/store/matchday';
import { setTactic } from '../../../football/store/rotation';
import type { FbSave } from '../../../football/store/tables';
import { AXES, type Axis, type ChanceEvent, type Mod } from '../../../football/types';
import { AXIS_INK, VALUE_INK, valueTier } from '../../../ui/inks';
import { Art } from '../Tonight';

/** A 0–100 number in its value-scale ink. */
export const pctInk = (pct: number) => ({ color: VALUE_INK[valueTier(pct, 100)] });

/** Brabo first or home first: the score with both crests, Brabo always named "Brabo". */
export function ScoreBar({ save, oppId, braboHome, score, big = false }: { save: FbSave; oppId: string; braboHome: boolean; score: [number, number]; big?: boolean }) {
  const opp = clubById(oppId);
  const own = <Art svg={crestSvg(save.crest.step, save.crest.opt, 28)} />, them = <Art svg={clubCrest(opp, 28)} />;
  const sides = braboHome ? [['Brabo', own, score[0]], [clubName(opp.id), them, score[1]]] as const : [[clubName(opp.id), them, score[1]], ['Brabo', own, score[0]]] as const;
  return (
    <header className={`mt-score${big ? ' big' : ''}`} aria-label={`${sides[0][0]} ${sides[0][2]}, ${sides[1][0]} ${sides[1][2]}`}>
      <span className="md-side">{sides[0][1]}<b>{sides[0][0]}</b><b className="fb-num">{sides[0][2]}</b></span>
      <span className="md-side r"><b className="fb-num">{sides[1][2]}</b><b>{sides[1][0]}</b>{sides[1][1]}</span>
    </header>
  );
}

/**
 * Ninety minutes in fifteen slices (match screen round, O44): labelled, and readable without colour: your chances
 * rise above the line, theirs hang below it, a goal is taller and filled.
 */
export function MomentumStrip({ chances, upTo = 90 }: { chances: ChanceEvent[]; upTo?: number }) {
  const cells = Array.from({ length: 15 }, (_, k) => {
    const cs = chances.filter((c) => !c.kept && c.minute > k * 6 && c.minute <= (k + 1) * 6);
    const goal = cs.find((c) => (c.side === 'atk' ? c.ok : !c.ok));
    const side = goal?.side ?? cs[0]?.side;
    return { side, goal: Boolean(goal), past: k * 6 < upTo };
  });
  return (
    <figure className="ms-strip">
      <figcaption>The chances, minute by minute: <b>yours above the line</b>, <b>theirs below</b>, goals taller</figcaption>
      <div className="mt-strip ms-updown" role="img" aria-label={`The chances across the ninety minutes: ${cells.filter((c) => c.side === 'atk').length} spells yours, ${cells.filter((c) => c.side === 'def').length} theirs`}>
        {cells.map((c, k) => <i key={k} className={`${c.side ?? ''}${c.goal ? ' goal' : ''}${c.past ? '' : ' future'}`} />)}
      </div>
    </figure>
  );
}

/** A club's name for the match screens: the full name, or its first word when long; never three-letter initials. */
export function clubName(id: string): string {
  if (id === OWN) return 'Brabo';
  const n = clubById(id).name;
  if (n.length <= 13) return n;
  const w = n.split(' ')[0];
  return w.length >= 4 && w.length <= 13 ? w : n;
}

/** A club's own colour for the scoreboard flip and the streamers: Brabo's orange, or the club's first colour. */
export const clubInk = (id: string): string => (id === OWN ? '#ff8a3d' : clubById(id).colours[0] ?? '#7fb8ff');
const textOn = (hex: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#14101c';
  const v = parseInt(m[1], 16), lum = (0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255;
  return lum > 0.55 ? '#14101c' : '#ffffff';
};

/**
 * One number on the scoreboard (match screen round, O44): when it changes it flips like a stadium board, the old
 * top half folding down and the new bottom half falling into place, the tile lit in the scoring club's colour.
 * `from` starts it on an older number, so a screen that opens on a goal flips too.
 */
export function FlipNum({ n, ink, from }: { n: number; ink: string; from?: number }) {
  const [st, setSt] = useState(() => ({ now: n, was: from ?? n, k: from !== undefined && from !== n ? 1 : 0 }));
  if (st.now !== n) setSt({ now: n, was: st.now, k: st.k + 1 });
  const style = { ['--flip' as string]: ink, ['--flipt' as string]: textOn(ink) } as CSSProperties;
  return (
    <span className={`ms-flip${st.k ? ' go' : ''}`} key={st.k} style={style}>
      <span className="ms-card">{st.now}</span>
      {st.k > 0 && st.was !== st.now && (
        <>
          <span className="ms-half b old" aria-hidden="true">{st.was}</span>
          <span className="ms-half b new" aria-hidden="true">{st.now}</span>
          <span className="ms-half t" aria-hidden="true">{st.was}</span>
        </>
      )}
    </span>
  );
}

export interface BoardSide { id: string; crest: string; n: number; from?: number }
/** The score with both crests and names (never initials), the numbers as flip tiles, and the clock under it. */
export function Board({ sides, clock, label }: { sides: [BoardSide, BoardSide]; clock?: ReactNode; label?: string }) {
  const [l, r] = sides;
  return (
    <header className="lt-board ms-board" aria-label={label ?? `${clubName(l.id)} ${l.n}, ${clubName(r.id)} ${r.n}`}>
      <span className="ms-side"><Art svg={l.crest} /><b>{clubName(l.id)}</b></span>
      <b className="ms-score" aria-hidden="true"><FlipNum n={l.n} from={l.from} ink={clubInk(l.id)} /><i>–</i><FlipNum n={r.n} from={r.from} ink={clubInk(r.id)} /></b>
      <span className="ms-side"><Art svg={r.crest} /><b>{clubName(r.id)}</b></span>
      {clock && <span className="lt-clock">{clock}</span>}
    </header>
  );
}

/** Every chance so far on a half pitch: yours in orange, theirs in blue, sized by the odds, goals filled. */
export function ShotMap({ chances, label = 'Shot map' }: { chances: ChanceEvent[]; label?: string }) {
  const W = 300, H = 110;
  const at = (c: ChanceEvent): [number, number] => {
    const [x, y] = c.land;
    return [W / 2 + x * 120, 26 + Math.abs(y) * 70 + (c.side === 'def' ? 6 : 0)];
  };
  return (
    <svg className="md-shots" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: ${chances.filter((c) => !c.kept).length} chances`}>
      <rect x="2" y="2" width={W - 4} height={H - 4} rx="6" className="pl" />
      <rect x={W / 2 - 60} y="2" width="120" height="34" className="pl" />
      <rect x={W / 2 - 26} y="2" width="52" height="14" className="pl" />
      <path d={`M${W / 2 - 22} 36 Q${W / 2} 50 ${W / 2 + 22} 36`} className="pl" />
      {chances.map((c, k) => {
        if (c.kept) return null;
        const [x, y] = at(c);
        const goal = c.side === 'atk' ? c.ok : !c.ok;
        const r = 4 + (c.side === 'atk' ? c.pct : 100 - c.pct) / 14;
        return <circle key={k} cx={x} cy={y} r={r} className={`${c.side}${goal ? ' goal' : ''}`} />;
      })}
    </svg>
  );
}

/** Two or three of your players in a move, by name, seeded by the chance: the scorer or saver last. */
export function moveChain(c: ChanceEvent, i: number, xi: XiPlace[], last?: string): string[] {
  if (!xi.length || c.kept) return [];
  const units: Axis[] = c.side === 'atk' ? ['Fuel', 'Pace', 'Power'] : ['Shape', 'Routine', 'Rest'];
  const out: string[] = [];
  for (const u of units) {
    const ps = xi.filter((x) => x.unit === u);
    if (!ps.length) continue;
    const p = ps[hashSeed(String(i), c.type, u) % ps.length];
    if (!out.includes(p.name)) out.push(p.name);
  }
  if (last) return [...out.filter((n) => n !== last).slice(0, 2), last];
  return out.slice(0, 3);
}

/** The player of the match: most goals, then most saves, then the first to score. */
export { playerOfMatch } from '../../../football/papers';

/** What moved the odds on a chance, as chips in each axis' ink (the biggest first). */
export function oddsChips(mods: Mod[], type: string): { text: string; axis: Axis }[] {
  // One chip per reason: a lift on all three axes (the weekly stack, tired legs) shows once.
  const seen = new Set<string>();
  return mods
    .filter((m) => m.d && m.kind !== 'home')
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
    .filter((m) => (seen.has(m.why) ? false : (seen.add(m.why), true)))
    .slice(0, 3)
    .map((m) => ({ axis: m.axis, text: `${m.why === type ? m.axis : m.why} ${m.d > 0 ? '+' : '−'}${Math.abs(Math.round(m.d * 10) / 10)}` }));
}

/** The eleven as dots in their unit's ink. */
export function ElevenDots({ xi }: { xi: XiPlace[] }) {
  const order = [...xi].sort((a, b) => AXES.indexOf(a.unit) - AXES.indexOf(b.unit));
  return (
    <div className="md-dots" role="img" aria-label={`Your eleven: ${order.map((x) => x.name).join(', ')}`}>
      {order.map((x) => <i key={x.player} style={{ borderColor: AXIS_INK[x.unit] }} />)}
    </div>
  );
}

/**
 * Before kick-off (lg-pre): the plan with the tempo and width dials, the scouted read, the eleven. The tactic is the
 * existing per-day pick (tap the assistant's to choose it yourself, tap yours again to give it back).
 */
export function PlanPanel({ date, tactic, plan, read, xi, cards, compact = false }: { date: string; tactic: { pick: Tactic; by: 'you' | 'assistant' }; plan: MatchdayPlan; read?: Read; xi: XiPlace[]; cards: Axis[]; compact?: boolean }) {
  const tempo = plan.tempo ?? 'normal', width = plan.width ?? 'middle';
  return (
    <section className={`md-plan${compact ? ' compact' : ''}`} aria-label="Your plan">
      <div className="fb-row"><span className="fb-lb">Your plan</span><span className="fb-s">{tactic.by === 'assistant' ? 'the assistant’s pick' : 'your pick'}</span></div>
      <div className="md-seg3">
        {TACTICS.map((t) => (
          <button key={t} type="button" className={tactic.pick === t ? 'on' : undefined} aria-pressed={tactic.pick === t} onClick={() => void setTactic(date, tactic.by === 'you' && tactic.pick === t ? null : t)}>
            {TACTIC_NAME[t]}
          </button>
        ))}
      </div>
      {!compact && <p className="fb-s">{tacticWords(tactic.pick)}</p>}
      <div className="md-dial">
        <div className="fb-row"><span>Tempo</span><b>{TEMPO_NAME[tempo]}</b></div>
        <div className="md-bars" role="radiogroup" aria-label="Tempo">
          {TEMPOS.map((t, k) => (
            <button key={t} type="button" role="radio" aria-checked={tempo === t} aria-label={TEMPO_NAME[t]} className={k <= TEMPOS.indexOf(tempo) ? 'lit' : undefined} onClick={() => void setPlan(date, { tempo: t })}><i /></button>
          ))}
        </div>
        {!compact && <p className="fb-s">{tempo === 'quick' ? 'One more chance each way.' : tempo === 'patient' ? 'One fewer chance each way.' : 'The usual number of chances.'}</p>}
      </div>
      <div className="md-dial">
        <div className="fb-row"><span>Width</span><b>{WIDTH_NAME[width]}</b></div>
        <div className="md-bars w" role="radiogroup" aria-label="Width">
          {WIDTHS.map((w) => (
            <button key={w} type="button" role="radio" aria-checked={width === w} aria-label={WIDTH_NAME[w]} className={width === w ? 'lit' : undefined} onClick={() => void setPlan(date, { width: w })}><i /></button>
          ))}
        </div>
      </div>
      {read && <p className={`md-read${read.tacticRight && read.widthRight ? ' good' : ''}`}>{read.scouted ? 'Scouted: ' : ''}{read.line}</p>}
      {cards.length > 0 && (
        <div className="md-cards" aria-label="Tactic cards">
          <span className="fb-lb">Tactic cards</span>
          <div className="md-chips">
            {[...new Set(cards)].map((a) => (
              <button key={a} type="button" className={`md-chip${plan.card === a ? ' on' : ''}`} style={{ color: AXIS_INK[a], borderColor: AXIS_INK[a] }} aria-pressed={plan.card === a} onClick={() => void setPlan(date, { card: plan.card === a ? undefined : a })}>+1 {a}</button>
            ))}
          </div>
          <p className="fb-s">{plan.card ? `Played tonight: +1 ${plan.card} for the whole match.` : 'Tap one to play it in this match.'}</p>
        </div>
      )}
      {xi.length > 0 && <><span className="fb-lb">Your eleven</span><ElevenDots xi={xi} /></>}
    </section>
  );
}

/** After a win (lg-full): three tiles, one to take. */
export function PickOfThree({ matchId, pick, name }: { matchId: string; pick: { tiles: PickTile[]; chosen?: number }; name: (id: string) => string }) {
  const ink = ['#3fd98a', '#c2b2ff', '#7fb8ff'];
  return (
    <section className="md-pick" aria-label="A win. Take one.">
      <span className="fb-lb">{pick.chosen === undefined ? 'A win. Take one.' : 'A win. You took one.'}</span>
      {pick.tiles.map((t, k) => {
        const w = pickWords(t, name);
        const on = pick.chosen === k;
        return (
          <button key={k} type="button" className={`mt-tile lt-tile${on ? ' on' : ''}`} style={{ ['--ink' as string]: t.kind === 'card' ? AXIS_INK[t.axis] : ink[k % 3] } as React.CSSProperties} disabled={pick.chosen !== undefined} aria-pressed={on} onClick={() => void choosePick(matchId, k)}>
            <span><b>{w.title}</b><small>{w.line}</small></span>
            {(t.kind === 'research' || t.kind === 'bond') && <b className="fb-num md-plus">+{t.n}</b>}
            {on && <b className="md-took">Taken</b>}
          </button>
        );
      })}
    </section>
  );
}
