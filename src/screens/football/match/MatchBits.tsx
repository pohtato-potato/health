// Matchday depth (spec 2026-11-12 §3): the pieces the match screens share. The score with crests, the momentum strip,
// the shot map, the players in a move, the plan (before kick-off), the pick of three. Presentation only.
import { clubCrest, crestSvg } from '../../../football/art/crest';
import { clubById } from '../../../football/data/load';
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
  const sides = braboHome ? [['Brabo', own, score[0]], [opp.short || opp.name, them, score[1]]] as const : [[opp.short || opp.name, them, score[1]], ['Brabo', own, score[0]]] as const;
  return (
    <header className={`mt-score${big ? ' big' : ''}`} aria-label={`${sides[0][0]} ${sides[0][2]}, ${sides[1][0]} ${sides[1][2]}`}>
      <span className="md-side">{sides[0][1]}<b>{sides[0][0]}</b><b className="fb-num">{sides[0][2]}</b></span>
      <span className="md-side r"><b className="fb-num">{sides[1][2]}</b><b>{sides[1][0]}</b>{sides[1][1]}</span>
    </header>
  );
}

/** Ninety minutes in fifteen slices: who had the ball's chances, goals taller. */
export function MomentumStrip({ chances, upTo = 90 }: { chances: ChanceEvent[]; upTo?: number }) {
  const cells = Array.from({ length: 15 }, (_, k) => {
    const cs = chances.filter((c) => !c.kept && c.minute > k * 6 && c.minute <= (k + 1) * 6);
    const goal = cs.find((c) => (c.side === 'atk' ? c.ok : !c.ok));
    const side = goal?.side ?? cs[0]?.side;
    return { side, goal: Boolean(goal), past: k * 6 < upTo };
  });
  return (
    <div className="mt-strip" role="img" aria-label="Momentum across the ninety minutes">
      {cells.map((c, k) => <i key={k} className={`${c.side ?? ''}${c.goal ? ' goal' : ''}${c.past ? '' : ' future'}`} />)}
    </div>
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
export function playerOfMatch(credits: { kind: 'goal' | 'save'; name: string }[] | undefined): string | undefined {
  if (!credits?.length) return undefined;
  const score = new Map<string, number>();
  for (const c of credits) score.set(c.name, (score.get(c.name) ?? 0) + (c.kind === 'goal' ? 3 : 1));
  return [...score].sort((a, b) => b[1] - a[1])[0][0];
}

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
export function PlanPanel({ date, tactic, plan, read, xi, cards }: { date: string; tactic: { pick: Tactic; by: 'you' | 'assistant' }; plan: MatchdayPlan; read?: Read; xi: XiPlace[]; cards: Axis[] }) {
  const tempo = plan.tempo ?? 'normal', width = plan.width ?? 'middle';
  return (
    <section className="md-plan" aria-label="Your plan">
      <div className="fb-row"><span className="fb-lb">Your plan</span><span className="fb-s">{tactic.by === 'assistant' ? 'the assistant’s pick' : 'your pick'}</span></div>
      <div className="md-seg3">
        {TACTICS.map((t) => (
          <button key={t} type="button" className={tactic.pick === t ? 'on' : undefined} aria-pressed={tactic.pick === t} onClick={() => void setTactic(date, tactic.by === 'you' && tactic.pick === t ? null : t)}>
            {TACTIC_NAME[t]}
          </button>
        ))}
      </div>
      <p className="fb-s">{tacticWords(tactic.pick)}</p>
      <div className="md-dial">
        <div className="fb-row"><span>Tempo</span><b>{TEMPO_NAME[tempo]}</b></div>
        <div className="md-bars" role="radiogroup" aria-label="Tempo">
          {TEMPOS.map((t, k) => (
            <button key={t} type="button" role="radio" aria-checked={tempo === t} aria-label={TEMPO_NAME[t]} className={k <= TEMPOS.indexOf(tempo) ? 'lit' : undefined} onClick={() => void setPlan(date, { tempo: t })}><i /></button>
          ))}
        </div>
        <p className="fb-s">{tempo === 'quick' ? 'One more chance each way.' : tempo === 'patient' ? 'One fewer chance each way.' : 'The usual number of chances.'}</p>
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
          <button key={k} type="button" className={`mt-tile${on ? ' on' : ''}`} style={{ borderColor: t.kind === 'card' ? AXIS_INK[t.axis] : ink[k % 3] }} disabled={pick.chosen !== undefined} aria-pressed={on} onClick={() => void choosePick(matchId, k)}>
            <span><b>{w.title}</b><small>{w.line}</small></span>
            {t.kind === 'research' && <b className="fb-num md-plus">+{t.n}</b>}
            {on && <b className="md-took">Taken</b>}
          </button>
        );
      })}
    </section>
  );
}
