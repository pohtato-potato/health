// Engine 2, layer 2 screens: the team sheet, how tonight adds up, the morning tactic, the limit-break moment, and the
// rotation facts on a player (form, freshness, past his best, traits, free agency and the buy-back).
import { useState } from 'react';
import { dayOfLogging } from '../../../domain/dates';
import { traitById } from '../../../football/content/traits';
import { clubById } from '../../../football/data/load';
import { euros } from '../../../football/money';
import { stepName, TIER_NAME } from '../../../football/players/cards';
import { FORMATIONS, UNIT_COLOUR, type Formation } from '../../../football/players/eleven';
import type { FbPlayer, LimitBreak, Unit } from '../../../football/players/types';
import { AGE_FLOOR, AGES } from '../../../football/rotation/condition';
import { canBuyBack } from '../../../football/rotation/freeAgents';
import { CHEM_MAX, MORALE_NAME, TACTIC_NAME, TACTICS, tacticWords, toggleStarter, type Tactic } from '../../../football/rotation/night';
import { traitsOf } from '../../../football/rotation/traits';
import { useBraboTier, usePlayer, useSave, useSheet, useTonight } from '../../../football/store/hooks';
import { buyBackPlayer, resetStarters, seeLimitBreak, setFormation, setSetPiece, setStarters, setTactic, setUnitCaptain } from '../../../football/store/rotation';
import { AXES } from '../../../football/types';
import { go } from '../../../router';
import { PlayerCard } from './Card';
import { Pitch } from './Screens';

const uc = (u: Unit) => ({ ['--uc' as string]: UNIT_COLOUR[u] });
const fmtDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
const ATTR_NAME: Record<string, string> = { strength: 'Strength', endurance: 'Endurance', volume: 'Volume', peak: 'Peak', distance: 'Distance', frequency: 'Frequency', km: 'km a week', kept: 'Kept', spread: 'Spread', hit: 'Hit rate', share: 'Share', range: 'In range', steady: 'Steadiness', change: 'Change' };

// ---------- small pieces ----------
/** The form line: the overall over the last five weeks (round 7's sparkline). */
export function FormLine({ p }: { p: FbPlayer }) {
  const xs = (p.trail ?? []).map(([, v]) => v);
  if (xs.length < 2) return <span className="rt-flat">too new for a line</span>;
  const lo = Math.min(...xs) - 1, hi = Math.max(...xs) + 1;
  const pts = xs.map((v, i) => `${((i / (xs.length - 1)) * 100).toFixed(1)},${(22 - ((v - lo) / (hi - lo)) * 20).toFixed(1)}`).join(' ');
  return <svg className="rt-spark" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true"><polyline points={pts} /></svg>;
}
const formWord = (f = 0) => (f >= 2 ? 'form rising' : f <= -2 ? 'form dipping' : f !== 0 ? (f > 0 ? 'form up a little' : 'form down a little') : 'form steady');
/** "Starts · form rising" under a name, as on the round-seven unit page. */
export function rowWords(p: FbPlayer, starts: boolean): string {
  if (p.status === 'academy') return 'In the academy';
  if (p.status === 'left') return p.freeAgent ? `Free agent at ${clubById(p.freeAgent.club).name}` : 'No longer logged';
  const bits = [starts ? 'Starts' : 'Bench'];
  if (p.pastBest) bits.push('past his best');
  else if (p.kind === 'exercise' && (p.fresh ?? 100) < 100) bits.push(`${p.fresh}% fresh`);
  else bits.push(formWord(p.form));
  return bits.join(' · ');
}
export function Freshness({ p }: { p: FbPlayer }) {
  if (p.kind !== 'exercise') return null;
  const f = p.fresh ?? 100;
  return <span className="rt-fz" role="img" aria-label={`Freshness ${f}%`}><i style={{ width: `${f}%` }} /></span>;
}

/** What sets off a player's next limit break, in plain words. */
function nextBreak(p: FbPlayer): string {
  if (p.limitBreaks.some((l) => l.tier === p.card.tier && l.why !== 'kit' && l.why !== 'profile')) {
    return `Broken at ${TIER_NAME[p.card.tier]} already. The next one opens when the card reaches a new tier.`;
  }
  switch (p.kind) {
    case 'exercise': return 'A new rep scheme held for four weeks, or 25% more load held over three sessions and three weeks. New kit always counts.';
    case 'steps': return 'A new band of 2,000 steps a day, held for four weeks.';
    case 'long-walk': return 'A walk 25% longer than your longest so far.';
    case 'route-walker': return '25% more km a week on the route than when this stretch began.';
    case 'bedtime': return 'Bedtime kept 6 nights in 7, four weeks running.';
    case 'protein': return 'Protein reached on 25 of 30 days.';
    case 'calories': return 'Eating in your range on 25 of 30 days.';
    case 'habit': return 'Kept on 60 days since the last one.';
    case 'waist': return 'Waist down an inch since the last one.';
    default: return 'This player has no limit break of its own; its unit-mates do.';
  }
}
const breakName = (l: LimitBreak) => (l.why === 'awakening' ? 'carried over from an Awakening' : l.what ?? l.why);

// ---------- the player page additions ----------
export function PlayerRotation({ p }: { p: FbPlayer }) {
  const tier = useBraboTier();
  const save = useSave();
  const [msg, setMsg] = useState<string | null>(null);
  const traits = traitsOf(p).map((id) => traitById(id)).filter((t): t is NonNullable<ReturnType<typeof traitById>> => Boolean(t));
  return (
    <>
      {p.freeAgent && save && tier !== undefined && (() => {
        const can = canBuyBack(p, save.budget, tier);
        return (
          <section className="rt-news" aria-label="Free agent">
            <span className="rt-kick">Transfer news</span>
            <b>{p.name} plays for {clubById(p.freeAgent.club).name}</b>
            <span>Since {fmtDate(p.freeAgent.on)}. Their {p.unit} is +1 against us while the player is there.</span>
            <div className="rt-kv"><span>Buy-back clause</span><b className="pl-num">{euros(can.fee)}</b><span>Never expires</span></div>
            <p className="rt-small">{p.freeAgent.readded ? 'It’s back in your logs.' : p.kind === 'exercise' ? 'To bring the player home, re-add the exercise to the plan, then pay the clause.' : 'To bring the player home, turn the habit back on, then pay the clause.'}</p>
            <button type="button" className="fb-btn pri" disabled={!can.ok} onClick={async () => setMsg(await buyBackPlayer(p.id))}>Pay {euros(can.fee)} and bring {p.name} home</button>
            {!can.ok && <p className="rt-small">{can.why}</p>}
            {msg && <p className="rt-small" role="status">{msg}</p>}
          </section>
        );
      })()}
      {p.pastBest && (
        <section className="rt-age" aria-label="Past his best">
          <b>Past his best</b>
          <span>No better growth for six weeks (sick days don’t count). The rating slips 1 every 2 weeks toward {p.best - AGE_FLOOR}; the {TIER_NAME[p.card.tier]} card stays {TIER_NAME[p.card.tier]}.</span>
          <span>A limit break, new kit or a new best ends it.</span>
        </section>
      )}
      {p.status === 'squad' && (
        <section className="fb-card" aria-label="Form and freshness">
          <div className="rt-kv"><span>Form</span><FormLine p={p} /><b className="pl-num">{signed(p.form ?? 0)}</b></div>
          <div className="rt-kv"><span>Freshness</span>{p.kind === 'exercise' ? <><Freshness p={p} /><b className="pl-num">{p.fresh ?? 100}%</b></> : <b className="rt-flat">doesn’t tire</b>}</div>
          <p className="rt-small">Match rating = overall × freshness + form. Back-to-back training days cost 15%; each day off gives 20% back.{AGES.includes(p.kind) ? ' Exercises and walks age after six weeks without a better growth attribute.' : ''}</p>
        </section>
      )}
      {traits.length > 0 && (
        <div className="rt-chips" aria-label="Traits">
          {traits.map((t) => <span key={t.id} className="rt-chip" title={t.text}><b>{t.name}</b><small>{t.text}</small></span>)}
        </div>
      )}
      <section className="fb-card gold" aria-label="Limit breaks">
        <span className="fb-lb">Limit breaks</span>
        {p.limitBreaks.map((l) => (
          <p key={`${l.on}${l.why}`} className="pl-prog">{fmtDate(l.on)} · {TIER_NAME[l.tier]} · {breakName(l)}{l.from != null ? ` · ${l.from} → ${l.to}` : ''}{l.trait ? ` · ${traitById(l.trait)?.name ?? l.trait}` : ''}</p>
        ))}
        {p.status === 'squad' && <p className="rt-small"><b>Next:</b> {nextBreak(p)}</p>}
      </section>
    </>
  );
}

// ---------- the limit-break moment (round 6, pinned) ----------
const CRACKS = <svg className="rt-ck" viewBox="0 0 176 246" preserveAspectRatio="none" aria-hidden="true"><path d="M88 0 L80 60 L96 92 L70 150 L92 246 M80 60 L30 40 M96 92 L150 70 M70 150 L20 190 M70 150 L140 210" /></svg>;
export function LimitBreakRoute({ id }: { id: string }) {
  const p = usePlayer(id);
  if (p === undefined) return null;
  if (!p) return <p className="fb-s">No such player.</p>;
  const l = [...p.limitBreaks].reverse().find((x) => !x.seen) ?? p.limitBreaks[p.limitBreaks.length - 1];
  if (!l) return <p className="fb-s">No limit break yet.</p>;
  const lead = l.shift?.find(([, a, b]) => b > a)?.[0];
  const trait = l.trait ? traitById(l.trait) : undefined;
  const done = () => { void seeLimitBreak(p.id); go('/football/player', { id: p.id }); };
  return (
    <div className="rt-lb">
      <i className="rt-ray" aria-hidden="true" />
      {[0, 1, 2].map((k) => <i key={k} className="rt-sw" style={{ animationDelay: `${k * 0.7}s` }} aria-hidden="true" />)}
      <span className="pl-kick">Limit break</span>
      <h2 className="fb-t">{p.name}</h2>
      <div className="rt-lbc"><PlayerCard card={p.card} art={p.art} seed={p.id} label={`${p.name}, ${stepName(p.card)} card, cracked with light`} />{CRACKS}</div>
      {l.from != null && <div className="rt-lbn" aria-label={`Rating ${l.from} to ${l.to}`}><span className="pl-num">{l.from}</span><i aria-hidden="true">→</i><b className="pl-num">{l.to}</b></div>}
      <p className="pl-sub">{l.what ? `${l.what[0].toUpperCase()}${l.what.slice(1)}.` : ''} The scale resets: the next stretch of progress counts again.</p>
      <div className="rt-rw">
        {lead && <span>{ATTR_NAME[lead] ?? lead} now leads</span>}
        {l.shift?.map(([a, from, to]) => <span key={a} className="rt-mv"><b>{ATTR_NAME[a] ?? a}</b> {from.toFixed(2)} → {to.toFixed(2)}</span>)}
        {trait ? <span className="rt-tr">New trait · {trait.name}</span> : <span>No new trait: three is the most a player holds.</span>}
        {trait && <span className="rt-small">{trait.text}</span>}
      </div>
      <button type="button" className="fb-btn pri wide" onClick={done}>Carry on</button>
    </div>
  );
}

// ---------- the morning tactic (round 7, pinned) ----------
export function TacticPicker({ date, pick, by }: { date: string; pick: Tactic; by: 'you' | 'assistant' }) {
  return (
    <section className="rt-tac" aria-label="Tonight's tactic">
      <div className="fb-row"><span className="fb-lb">Tonight’s tactic</span><span className="fb-s">{by === 'assistant' ? 'the assistant’s pick' : 'your pick'}</span></div>
      <div className="rt-tac3">
        {TACTICS.map((t) => (
          <button key={t} type="button" className={pick === t ? 'on' : undefined} aria-pressed={pick === t && by === 'you'} onClick={() => void setTactic(date, by === 'you' && pick === t ? null : t)}>
            <b>{TACTIC_NAME[t]}</b>
            {pick === t && by === 'assistant' && <small className="rt-as">assistant</small>}
            <small>{tacticWords(t)}</small>
          </button>
        ))}
      </div>
      <p className="fb-s">{by === 'assistant' ? 'Left to the assistant, who leans on what you did best today. Tap one to choose it yourself.' : 'Tap it again to leave it to the assistant.'}</p>
      <button type="button" className="fb-btn sm" onClick={() => go('/football/blend')}>How tonight adds up ›</button>
    </section>
  );
}

// ---------- how tonight adds up (round 7, pinned) ----------
export function BlendRoute() {
  const t = useTonight();
  if (t === undefined) return null;
  if (!t || !t.base) return <p className="fb-s">Nothing to add up yet.</p>;
  const morale = t.save.morale ?? 0;
  return (
    <div className="pl-page">
      <button type="button" className="fb-btn sm" onClick={() => go('/football', undefined, { replace: true })}>← Tonight</button>
      <h2 className="fb-t">How tonight adds up</h2>
      <p className="pl-sub rt-left">Today decides 70%, the squad 30%. Everything else together moves an axis by 3 at most.</p>
      <div className="rt-bl">
        {AXES.map((a) => {
          const ns = t.nudges.filter((n) => n.axis === a);
          const v = t.liveValues[a];
          return (
            <div key={a} style={uc(a)}>
              <span className="rt-bn">{a}</span>
              <span className="rt-bb" aria-hidden="true"><i className="rt-td" style={{ width: `${Math.round(t.today[a] * 3.5)}%` }} /><i className="rt-sq" style={{ width: `${Math.round((t.squad[a] ?? 0) * 1.5)}%` }} /></span>
              <b className="pl-num">{v}</b>
              <small>{t.flags[a] ? 'no data tonight: plays as it is' : `today ${t.today[a]} · squad ${t.squad[a] != null ? Math.round(t.squad[a]!) : '—'}${ns.length ? ` · ${ns.map((n) => `${signed(n.d)} ${n.why}`).join(', ')}` : ''}${Math.abs(ns.reduce((s, n) => s + n.d, 0)) > 3 ? ' (capped at 3)' : ''}`}</small>
            </div>
          );
        })}
      </div>
      <p className="rt-lgd"><span><i className="rt-td" />Today</span><span><i className="rt-sq" />Squad</span></p>
      <section className="fb-card" aria-label="Tonight's nudges">
        <div className="rt-kv"><span>Tactic</span><b>{TACTIC_NAME[t.tactic.pick]}</b><span>{t.tactic.by === 'assistant' ? 'the assistant' : 'yours'}</span></div>
        <div className="rt-kv"><span>Morale</span><b>{MORALE_NAME[morale]}</b><span>{morale === 2 ? `+1 to the armband’s unit${t.save.captain ? ` (${t.save.captain})` : ''}` : 'a win lifts it'}</span></div>
        <div className="rt-kv"><span>Formation</span><b>{t.save.sheet?.formation ?? '4-3-3'}</b><span>no tilt</span></div>
      </section>
    </div>
  );
}

// ---------- the team sheet (round 7, pinned) ----------
function Bond({ level }: { level: number }) {
  return (
    <span className="rt-bond" role="img" aria-label={`Chemistry ${level} of ${CHEM_MAX}`}>
      {Array.from({ length: CHEM_MAX }, (_, i) => <i key={i} className={i < level ? 'on' : undefined} />)}
      <small>{level} of {CHEM_MAX}</small>
    </span>
  );
}
export function TeamSheetRoute() {
  const s = useSheet();
  if (s === undefined) return null;
  if (!s) return <p className="fb-s">The team sheet opens once the club is founded.</p>;
  const formation: Formation = s.formation;
  const byId = new Map(s.players.map((p) => [p.id, p]));
  const starting = new Set(s.xi.map((x) => x.player));
  const picked = Object.keys(s.save.sheet?.picks ?? {}).length > 0;
  const date = dayOfLogging(Date.now());
  return (
    <div className="pl-page">
      <button type="button" className="fb-btn sm" onClick={() => go('/football/club', undefined, { replace: true })}>← The eleven</button>
      <span className="pl-sub rt-left">{new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long' })} · change it any day</span>
      <h2 className="fb-t">Team sheet</h2>
      <div className="rt-fm" aria-label="Formations">
        {(Object.keys(FORMATIONS) as Formation[]).map((f) => {
          const open = s.rot.formations.includes(f);
          const cls = f === formation ? 'on' : open ? undefined : 'lk';
          const words = <><b>{f}</b><small>{f === formation ? 'on' : open ? 'open' : 'in the tree'}</small></>;
          return open && f !== formation
            ? <button key={f} type="button" className={cls} onClick={() => void setFormation(f)} aria-label={`Play ${f}`}>{words}</button>
            : <span key={f} className={cls} aria-current={f === formation ? 'true' : undefined}>{words}</span>;
        })}
      </div>
      <Pitch xi={s.xi} />
      <p className="pl-sub rt-left">Untouched, the best match ratings start; Power picks from your latest session. Tap a player to start or bench them.</p>
      {picked && <button type="button" className="fb-btn sm" onClick={() => void resetStarters()}>Let the best ratings start</button>}
      {AXES.map((u) => {
        const unit = s.members.filter((m) => m.unit === u).sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
        const places = FORMATIONS[formation][u];
        const starters = s.xi.filter((x) => x.unit === u).map((x) => x.player);
        const chem = s.save.chem?.[u]?.level ?? 0;
        return (
          <section key={u} className="rt-unit" style={uc(u)} aria-label={`${u} starters`}>
            <div className="fb-row"><h3 className="rt-uh">{u}</h3><span className="fb-s">{places} {places === 1 ? 'starts' : 'start'}</span></div>
            <div className="rt-chem"><span>Chemistry</span><Bond level={chem} /></div>
            {unit.length === 0 && <p className="fb-s">No players yet.</p>}
            {unit.map((m) => {
              const p = byId.get(m.id)!;
              const on = starting.has(m.id);
              return (
                <button key={m.id} type="button" className={`rt-pick${on ? ' st' : ''}`} aria-pressed={on} onClick={() => void setStarters(u, toggleStarter(unit, starters, m.id, places))}>
                  <PlayerCard card={p.card} art={p.art} seed={p.id} />
                  <span className="pl-col"><b>{m.name}</b><span>{rowWords(p, on)}</span></span>
                  <b className="pl-num">{m.rating}</b>
                  <span className="rt-tag">{on ? 'Starts' : 'Bench'}</span>
                  <Freshness p={p} />
                </button>
              );
            })}
          </section>
        );
      })}
      <section className="fb-card" aria-label="Captains">
        <div className="fb-row"><span className="fb-lb">Captains</span><span className="fb-s">{s.rot.captains ? 'one per unit' : 'not yet'}</span></div>
        {!s.rot.captains && <p className="fb-s">Units get their own captains once Unit captains is researched in the tree.</p>}
        {s.rot.captains && <div className="rt-cpt">
          {AXES.map((u) => {
            const unit = s.members.filter((m) => m.unit === u);
            return (
              <label key={u} style={uc(u)}>
                <b>{u}</b>
                <select className="fb-select" value={s.captains[u] ?? ''} onChange={(e) => void setUnitCaptain(u, e.target.value)} disabled={!unit.length} aria-label={`${u} captain`}>
                  {!s.captains[u] && <option value="">None yet</option>}
                  {unit.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </label>
            );
          })}
        </div>}
        <label className="rt-sp">
          <span className="fb-lb">Set pieces</span>
          <select className="fb-select" value={s.setPiece ?? ''} onChange={(e) => void setSetPiece(e.target.value)} aria-label="Set-piece taker">
            {!s.setPiece && <option value="">None yet</option>}
            {s.members.filter((m) => m.unit === 'Power').map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <p className="fb-s">A captain holding Captain’s armband lifts its unit’s chemistry by 1. Set-piece goals go to the taker when it starts.</p>
      </section>
      <p className="fb-s">Chemistry rises by 1 for each week of match days the same starters play together, and drops by 1 when two or more change. At 4 or more, its unit gets +1. Sick days pause it.</p>
    </div>
  );
}

/** The Club page's links into the rotation: the team sheet and a waiting limit break. */
export function RotationLinks({ players }: { players: FbPlayer[] }) {
  const lb = players.find((p) => p.limitBreaks.some((l) => !l.seen && l.why !== 'awakening'));
  return (
    <>
      {lb && (
        <button type="button" className="pl-banner rt-lbban" onClick={() => go('/football/limit', { id: lb.id })}>
          <PlayerCard card={lb.card} art={lb.art} seed={lb.id} />
          <span><b>{lb.name}</b> has broken its limit. Tap to see what changed.</span>
        </button>
      )}
      <button type="button" className="fb-btn wide" onClick={() => go('/football/sheet')}>Team sheet ›</button>
    </>
  );
}
