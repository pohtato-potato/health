// A cup match in the tactics-board world (visual rounds 1–3, approved 11 Nov): the round on a slab, both crests, a strip
// of how each spell went, the pitch with their defence as a row in front of goal and their coming attack drawn with its
// number, the finish preview in words, stamina pips, the hand as coaching-board cards and End the spell. A goal adds
// itself up one row at a time, the total shakes and the screen takes the scorer's axis colour; a combination lands
// with a small burst. Penalties: pick a side, then take it.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { buzz } from '../../../audio';
import { actsAs, cardName, longText, shortText, titleOf } from '../../../football/cup/cards';
import { SIDE_WORD, SIGNATURE, STYLE_NAME, STYLE_TEXT } from '../../../football/cup/clubs';
import {
  blocked, canRecycle, costOf, coverNow, endSpell, lineNow, play, preview, recycle, seesAhead, seesHabits, shownIntents, threatNow, TUNE,
  type Feed, type MatchState,
} from '../../../football/cup/match';
import { dive, kick, leanOf } from '../../../football/cup/pens';
import { SIDES, type Card, type Side } from '../../../football/cup/types';
import { OWN } from '../../../football/store/season';
import { useSave } from '../../../football/store/hooks';
import { AXIS_INK } from '../../../ui/inks';
import { ArtDefs, Crest, MoveCard, Silhouette, Slab, WILD_INK } from './CupArt';

const OPP = '#93c3dc';
const CHALK = '#f3efe4';
const ACC = '#e9a46a';

/** The crests and the score: you on the left, them on the right. */
export function ScoreRow({ s }: { s: MatchState }) {
  const save = useSave();
  return (
    <div className="cup-top" aria-label={`Brabo ${s.score[0]}, ${s.club.name} ${s.score[1]}`}>
      <span className="cup-sc"><Crest id={OWN} size={28} own={save?.crest} />Brabo {s.score[0]}</span>
      <span className="cup-sc">{s.score[1]} {s.club.short}<Crest id={s.club.id} size={28} /></span>
    </div>
  );
}

/** How each spell went: up for your chances and goals, down for their attacks that hurt. */
function Momentum({ s }: { s: MatchState }) {
  const cells = Array.from({ length: TUNE.spells }, (_, i) => {
    const sp = i + 1;
    const f = s.feed.filter((x) => x.spell === sp);
    const up = f.some((x) => x.kind === 'goal') ? 14 : f.some((x) => x.kind === 'near') ? 7 : 0;
    const down = f.some((x) => x.kind === 'conceded') ? 14 : f.some((x) => x.kind === 'fitness') ? 7 : 0;
    return { sp, up, down };
  });
  return (
    <div className="cup-mom" role="img" aria-label={`How each spell went. ${cells.filter((c) => c.sp < s.spell).map((c) => `Spell ${c.sp}: ${c.up > 10 ? 'a goal' : c.up ? 'a near miss' : 'no chance'}${c.down > 10 ? ', they scored' : c.down ? ', fitness lost' : ''}`).join('. ')}`}>
      {cells.map((c) => (
        <i key={c.sp} className={`${c.up ? 'u' : ''} ${c.down ? 'd' : ''} ${c.sp === s.spell && s.phase === 'play' ? 'now' : ''}`} style={{ '--h': `${c.up}px`, '--hd': `${c.down}px` } as CSSProperties} />
      ))}
    </div>
  );
}

const BALL_Y = [272, 226, 150];
/** The pitch, their goal at the top: their defence a row in front of it, their attack coming down the right. */
function Pitch({ s }: { s: MatchState }) {
  const line = lineNow(s);
  const threat = threatNow(s);
  const by = BALL_Y[s.zone];
  const passes = Math.min(4, s.move.passes + (s.move.carries ?? 0));
  // the move so far: a zigzag of players up to the ball
  const pts = Array.from({ length: passes }, (_, i) => [i % 2 ? 150 : 96, Math.min(286, by + 34 * (passes - i))] as [number, number]);
  const trail = [...pts, [124, by] as [number, number]];
  return (
    <svg className="cup-pt" viewBox="0 0 336 300" role="img"
      aria-label={`The pitch. The ball is in ${['your third', 'midfield', 'the final third'][s.zone]}. Build-up times ${s.build}. Their defence ${line}. ${threat ? `Their attack coming: ${threat}.` : 'No attack this spell.'} Your cover ${coverNow(s)}.`}>
      <defs><marker id="cup-ah2" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="context-stroke" /></marker></defs>
      <g fill="none" stroke={CHALK} strokeWidth="1.6" strokeDasharray="6 6" opacity=".8">
        <rect x="4" y="4" width="328" height="292" rx="10" /><path d="M4 104h328M4 200h328" /><path d="M120 4v26h96V4M120 296v-26h96v26" />
      </g>
      <g fontSize="14" fill="#c4c1cf">
        <text x="12" y="98">Final third</text><text x="12" y="194">Midfield</text><text x="12" y="288">Your third</text>
      </g>
      <g className="cup-def">
        <path d="M60 50h216" stroke={OPP} strokeWidth="4" />
        {[84, 134, 190, 240].map((x) => <path key={x} d={`M${x} 42l12 16M${x + 12} 42l-12 16`} stroke={OPP} strokeWidth="3" />)}
      </g>
      <rect x="186" y="62" width="142" height="26" rx="13" fill="#0a1712" stroke={OPP} strokeWidth="1.6" />
      <text x="257" y="80" fontSize="14" fontWeight="700" fill={OPP} textAnchor="middle">Their defence {line}</text>
      {threat > 0 && (
        <g className="cup-coming">
          <path d="M296 104 Q308 190 236 262" stroke={OPP} strokeWidth="2.4" strokeDasharray="3 7" fill="none" markerEnd="url(#cup-ah2)" />
          <rect x="222" y="150" width="106" height="26" rx="13" fill="#0a1712" stroke={OPP} strokeWidth="1.6" />
          <text x="275" y="168" fontSize="14" fontWeight="700" fill={OPP} textAnchor="middle">Coming: {threat}</text>
        </g>
      )}
      <g stroke={ACC} fill="none" strokeWidth="2.6">
        {trail.slice(1).map(([x, y], i) => <path key={i} d={`M${trail[i][0]} ${trail[i][1]} L${x} ${y}`} strokeDasharray="5 6" markerEnd={i === trail.length - 2 ? 'url(#cup-ah2)' : undefined} />)}
        {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="8" />)}
      </g>
      <circle key={`${s.zone}-${s.spell}`} className="cup-ball" cx="124" cy={by} r="7" fill="#fff" />
      <rect x="20" y={by + 12} width="100" height="26" rx="13" fill={ACC} />
      <text x="70" y={by + 30} fontSize="14" fontWeight="700" fill="#0a1712" textAnchor="middle">Build-up ×{s.build.toFixed(1)}</text>
      <rect x="118" y="268" width="100" height="24" rx="12" fill="#0a1712" stroke={CHALK} strokeWidth="1.6" />
      <text x="168" y="285" fontSize="14" fontWeight="700" fill={CHALK} textAnchor="middle">Your cover {coverNow(s)}</text>
    </svg>
  );
}

/** The finish preview in words, or what their attack will do. */
function sayLine(s: MatchState): ReactNode {
  const fins = s.hand
    .map((c) => ({ c, p: c.kind === 'total' ? null : preview(s, c.id) }))
    .filter((x) => x.p)
    .sort((a, b) => b.p!.chance - a.p!.chance);
  const best = fins[0];
  if (best?.p) {
    const p = best.p;
    const verdict = p.chance >= p.line ? 'That beats them.' : p.chance * 2 >= p.line ? 'A near miss: it would lower their defence.' : 'Not enough yet: build up first.';
    return <span>{cardName(best.c)} now: {p.shot} × {p.build.toFixed(1)} = <b>{p.chance} against {p.line}. {verdict}</b></span>;
  }
  const t = threatNow(s);
  const cov = coverNow(s);
  if (!t) return <span>No attack this spell. Build a move.</span>;
  const short = t - cov;
  return <span>Their attack of {t} meets your cover of {cov}: <b>{short <= 0 ? 'you hold.' : short <= TUNE.shortMax ? `you lose fitness.` : 'they score.'}</b></span>;
}

const HOLD_MS = 450;
function Hand({ s, recycling, onTap, onRead }: { s: MatchState; recycling: boolean; onTap: (c: Card) => void; onRead: (c: Card) => void }) {
  const timer = useRef<number | undefined>(undefined);
  const held = useRef(false);
  const down = (c: Card) => { held.current = false; timer.current = window.setTimeout(() => { held.current = true; onRead(c); }, HOLD_MS); };
  const cancel = () => window.clearTimeout(timer.current);
  if (!s.hand.length) return <p className="cup-q">No cards left this spell. End the spell.</p>;
  return (
    <div className="cup-hand" aria-label="Your hand. Tap to play, press and hold to read.">
      {s.hand.map((c) => {
        const why = c.kind === 'total' ? (s.basics.some((k) => !blocked(s, c.id, k)) ? null : 'Nothing to play as') : blocked(s, c.id);
        const off = recycling ? false : !!why;
        const act = actsAs(c);
        return (
          <button
            key={c.id} type="button" className="cup-hc"
            aria-label={`${cardName(c)}, ${c.level}, costs ${costOf(s, c)}. ${shortText(act.kind, act.level)}.${off && why ? ` ${why}` : ''}`}
            onPointerDown={() => down(c)} onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel}
            onContextMenu={(e) => e.preventDefault()}
            onClick={() => { cancel(); if (held.current) { held.current = false; return; } if (!off) onTap(c); }}
          >
            <MoveCard c={c} cost={costOf(s, c)} off={off} note={recycling ? 'Drop' : undefined} noteKind="drop" />
          </button>
        );
      })}
    </div>
  );
}

export function Sheet({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  // On the page body, above the tab bar: the Football page is its own layer.
  return createPortal(
    <div className="cup-sheet-bg" onClick={onClose}>
      <div className="cup-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h2 className="cup-h">{title}</h2>
        {children}
        <button type="button" className="cup-btn ghost" onClick={onClose}><span>Close</span></button>
      </div>
    </div>,
    document.body,
  );
}

/** A goal adding itself up: each step of the move, one row at a time, then the total, which shakes. */
function GoalMoment({ f, after, onDone }: { f: Feed; after: number; onDone: () => void }) {
  const ink = f.axis ? AXIS_INK[f.axis] : WILD_INK;
  const steps = f.steps ?? [];
  const rows = [...steps.map((x) => ({ label: x.label, val: x.val, ink: x.axis ? AXIS_INK[x.axis] : x.combo ? WILD_INK : CHALK, combo: x.combo })),
    { label: 'Build-up', val: `×${(f.build ?? 1).toFixed(1)}`, ink: ACC, combo: false }];
  const [shown, setShown] = useState(0);
  const [total, setTotal] = useState(0);
  useEffect(() => {
    if (shown < rows.length) { const t = window.setTimeout(() => setShown(shown + 1), 380); return () => window.clearTimeout(t); }
    const goal = f.chance ?? 0;
    if (total < goal) { const t = window.setTimeout(() => setTotal(Math.min(goal, total + Math.max(1, Math.ceil(goal / 12)))), 40); return () => window.clearTimeout(t); }
    return undefined;
  }, [shown, total, rows.length, f.chance]);
  const done = shown >= rows.length && total >= (f.chance ?? 0);
  return createPortal(
    <div className="cup-goal" style={{ '--ink': ink } as CSSProperties} role="dialog" aria-modal="true" aria-label={`Goal. ${f.chance} against their ${f.line}.`} onClick={onDone}>
      <p className="cup-goal-big">GOAL</p>
      <p className="cup-goal-who">{f.title}</p>
      <ul className="cup-goal-rows">
        {rows.slice(0, shown).map((r, i) => (
          <li key={i} className={r.combo ? 'combo' : ''} style={{ '--k': r.ink } as CSSProperties}><span>{r.label}</span><b>{r.val}</b></li>
        ))}
      </ul>
      {shown >= rows.length && <p className={`cup-goal-tot ${done ? 'shake' : ''}`}><b>{total}</b> against their {f.line}</p>}
      {done && <p className="cup-goal-after">Their defence re-forms at {after}.</p>}
      <button type="button" className="cup-btn" onClick={onDone}><span>Carry on</span></button>
    </div>,
    document.body,
  );
}

/** The elite club's signature move, on a banner before kick-off. */
function Banner({ s, onGo }: { s: MatchState; onGo: () => void }) {
  const sig = SIGNATURE[s.club.elite!];
  return (
    <div className="cup-board cup-banner">
      <Slab>AN ELITE CLUB</Slab>
      <div className="cup-banner-crest"><Crest id={s.club.id} size={120} /></div>
      <h1 className="cup-h1">{s.club.name}</h1>
      <div className="cup-sig">
        <p className="cup-cap">Their signature move</p>
        <p className="cup-h">{sig.name}</p>
        <p>{sig.text}</p>
      </div>
      <p className="cup-q">{STYLE_NAME[s.club.style]}. {STYLE_TEXT[s.club.style]}</p>
      <span className="cup-grow" />
      <button type="button" className="cup-btn" onClick={onGo}><span>Kick off</span></button>
    </div>
  );
}

/** One cup match. `label` is the round; `commit` saves after every card. */
export function MatchScreen({ s, label, commit, onAbandon }: { s: MatchState; label: string; commit: (n: MatchState) => void; onAbandon: () => void }) {
  const save = useSave();
  const feel = save?.buzz !== false;
  const [recycling, setRecycling] = useState(false);
  const [read, setRead] = useState<Card | null>(null);
  const [wild, setWild] = useState<Card | null>(null);
  const [about, setAbout] = useState(false);
  const [goal, setGoal] = useState<{ f: Feed; after: number } | null>(null);
  const [burst, setBurst] = useState<string[]>([]);
  const [kicked, setKicked] = useState(!s.club.elite || (s.played ?? 0) > 0 || s.spell > 1);
  const step = (n: MatchState) => {
    if (n === s) return;
    commit(n);
    const g = n.last.find((f) => f.kind === 'goal');
    if (g) setGoal({ f: g, after: lineNow(n) });
    const combos = n.last.filter((f) => f.kind === 'combo').map((f) => f.text.split(':')[0]);
    setBurst(combos);
    if (!feel) return;
    if (g) buzz([60, 40, 60, 40, 220]);
    else if (n.last.some((f) => f.kind === 'conceded')) buzz([200]);
    else if (combos.length) buzz([30, 30, 30]);
    else if (n.zone > s.zone || n.build > s.build) buzz(18);
  };
  const tap = (c: Card) => {
    if (recycling) {
      const n = recycle(s, c.id);
      step(n);
      if (!canRecycle(n)) setRecycling(false);
      return;
    }
    if (c.kind === 'total') { setWild(c); return; }
    step(play(s, c.id));
  };
  if (!kicked && s.club.elite) return <Banner s={s} onGo={() => setKicked(true)} />;
  if (s.phase === 'pens') return <Pens s={s} label={label} commit={commit} feel={feel} />;
  const toasts = s.last.filter((f) => f.kind !== 'spell' && f.kind !== 'goal' && f.kind !== 'combo');
  const pips = Math.max(s.stamina, TUNE.stamina);
  return (
    <div className="cup-board cup-match">
      <ArtDefs />
      <div className="cup-top"><Slab>{label.toUpperCase()}</Slab><span className="cup-q">Spell {s.spell} of {TUNE.spells}</span></div>
      <ScoreRow s={s} />
      <Momentum s={s} />
      <div className="cup-pwrap">
        <Pitch s={s} />
        <button type="button" className="cup-club" onClick={() => setAbout(true)} aria-label={`${s.club.name}: how they play`}>How they play</button>
        <div className="cup-toasts" aria-live="polite">
          {burst.map((b, i) => <p key={`${s.feed.length}-b${i}`} className="cup-burst">{b}</p>)}
          {toasts.map((f, i) => <p key={`${s.feed.length}-${i}`} className={`cup-toast k-${f.kind}`}>{f.text}</p>)}
        </div>
      </div>
      <p className="cup-say" aria-live="polite">{sayLine(s)}</p>
      {seesAhead(s) && shownIntents(s).length > 1 && (
        <p className="cup-q">Their next: {shownIntents(s).slice(1).map((x) => (x.threat ? x.threat : 'none')).join(', ')}.</p>
      )}
      <div className="cup-st">
        <span aria-label={`Stamina ${s.stamina}`}>{Array.from({ length: pips }, (_, i) => <i key={i} className={`cup-pip ${i < s.stamina ? 'f' : ''}`} />)} stamina</span>
        <span className="cup-q">Fitness {s.fitness} · Draw {s.draw.length}</span>
      </div>
      {s.inPlay.length > 0 && <p className="cup-q">In play: {s.inPlay.map((c) => cardName(c)).join(', ')}</p>}
      {recycling && <p className="cup-q">Tap a card to drop it and draw another. {s.freeRecycles ? 'Free.' : `Costs ${TUNE.recycleCost} stamina.`}</p>}
      <Hand s={s} recycling={recycling} onTap={tap} onRead={setRead} />
      <div className="cup-acts">
        <button type="button" className={`cup-btn ghost ${recycling ? 'on' : ''}`} disabled={!recycling && !canRecycle(s)} aria-pressed={recycling} onClick={() => setRecycling(!recycling)}>
          <span>{recycling ? 'Done' : `Recycle${s.freeRecycles ? ` (${s.freeRecycles} free)` : ''}`}</span>
        </button>
        <button type="button" className="cup-btn" onClick={() => { setRecycling(false); setBurst([]); step(endSpell(s)); }}><span>End the spell</span></button>
      </div>
      {goal && <GoalMoment f={goal.f} after={goal.after} onDone={() => setGoal(null)} />}
      {read && (
        <Sheet onClose={() => setRead(null)} title={cardName(read)}>
          <div className="cup-read"><MoveCard c={read} cost={costOf(s, read)} /></div>
          <p>{longText(read)}</p>
          {blocked(s, read.id) && read.kind !== 'total' && <p className="cup-q">Now: {blocked(s, read.id)}</p>}
        </Sheet>
      )}
      {about && (
        <Sheet onClose={() => setAbout(false)} title={s.club.name}>
          <p><b>{STYLE_NAME[s.club.style]}.</b> {STYLE_TEXT[s.club.style]}</p>
          {s.club.elite && <p><b>{SIGNATURE[s.club.elite].name}.</b> {SIGNATURE[s.club.elite].text}</p>}
          <p className="cup-q">{s.club.scouted ? 'Scouted: you have met them in the league, so you see their attacks two spells ahead and their penalty habits.' : 'Not scouted: meet them in the league to see their attacks two spells ahead.'}</p>
          <p className="cup-q">A chance at or above their defence is a goal; at half of it or more, a near miss that lowers it. Their attack beating your cover by 1 to {TUNE.shortMax} costs fitness; by more, they score.</p>
          <button type="button" className="cup-btn ghost" onClick={() => { setAbout(false); onAbandon(); }}><span>Give up the run</span></button>
        </Sheet>
      )}
      {wild && (
        <Sheet onClose={() => setWild(null)} title="Total football plays as…">
          <div className="cup-wild">
            {s.basics.map((k) => (
              <button key={k} type="button" className="cup-opt" disabled={!!blocked(s, wild.id, k)} onClick={() => { step(play(s, wild.id, k)); setWild(null); }}>
                <span>{titleOf(k)}</span><span className="cup-q">{shortText(k, 'basic')}</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}

// --- penalties ---------------------------------------------------------------------------------------------------
const aimWord = (x: Side) => (x === 'centre' ? 'down the middle' : x);
const diveWord = (x: Side) => (x === 'centre' ? 'stayed in the middle' : `dived ${x}`);
const SIDE_LABEL: Record<Side, string> = { left: 'Left', centre: 'Centre', right: 'Right' };
function Pens({ s, label, commit, feel }: { s: MatchState; label: string; commit: (n: MatchState) => void; feel: boolean }) {
  const p = s.pens!;
  const mine = p.turn === 'us';
  const [side, setSide] = useState<Side | null>(null);
  const last = p.kicks[p.kicks.length - 1];
  const dots = (xs: boolean[]) => Array.from({ length: Math.max(5, xs.length) }, (_, i) => <i key={i} className={i < xs.length ? (xs[i] ? 'in' : 'out') : ''} />);
  const hint = seesHabits(s)
    ? (mine ? `Scouted: their keeper tends to dive ${SIDE_WORD[leanOf(p.keeper)]}.` : `Scouted: their takers like ${SIDE_WORD[leanOf(p.takers)]}.`)
    : 'Not scouted: you have not met them in the league, so their habits are hidden.';
  const go = () => {
    if (!side) return;
    const n = mine ? kick(s, side) : dive(s, side);
    const k = n.pens?.kicks[n.pens.kicks.length - 1];
    if (feel && k) buzz(k.who === 'us' ? (k.scored ? [60, 40, 160] : [200]) : k.scored ? [200] : [60, 40, 160]);
    setSide(null);
    commit(n);
  };
  return (
    <div className="cup-board cup-match cup-pens">
      <div className="cup-top"><Slab>{label.toUpperCase()} · PENALTIES</Slab></div>
      <ScoreRow s={s} />
      <div className="cup-tally" aria-label={`Penalties: Brabo ${p.us.filter(Boolean).length}, ${s.club.short} ${p.them.filter(Boolean).length}`}>
        <p><span>Brabo</span><span className="cup-dots">{dots(p.us)}</span></p>
        <p><span>{s.club.short}</span><span className="cup-dots">{dots(p.them)}</span></p>
      </div>
      {last && <p className="cup-say" aria-live="polite">{last.who === 'us' ? `You shot ${aimWord(last.aim)}, the keeper ${diveWord(last.dive)}: ${last.scored ? 'goal' : last.dive === last.aim ? 'saved' : 'wide'}.` : `They shot ${aimWord(last.aim)}, you ${diveWord(last.dive)}: ${last.scored ? 'goal' : 'saved'}.`}</p>}
      <svg className="cup-pgoal" viewBox="0 0 336 170" role="img" aria-label={mine ? 'Their goal and keeper' : 'Your goal: you are the keeper'}>
        <g fill="none" stroke={CHALK} strokeWidth="3"><path d="M24 160V20h288v140" /><path d="M24 20l18 12h252l18-12" opacity=".5" /></g>
        <g stroke={CHALK} strokeWidth="1" opacity=".22">{Array.from({ length: 11 }, (_, i) => <path key={i} d={`M${48 + i * 24} 32v128`} />)}{Array.from({ length: 5 }, (_, i) => <path key={i} d={`M42 ${52 + i * 24}h252`} />)}</g>
        {SIDES.map((x, i) => <text key={x} x={80 + i * 88} y="152" fontSize="14" fontWeight="700" fill={side === x ? ACC : '#c4c1cf'} textAnchor="middle">{SIDE_LABEL[x].toUpperCase()}</text>)}
        <g fill={mine ? OPP : ACC} opacity=".9"><circle cx="168" cy="72" r="13" /><path d="M150 90h36l8 46h-16l-4-26-4 26h-16l-4-26-4 26h-16z" /><path d="M150 94l-26 20M186 94l26 20" stroke={mine ? OPP : ACC} strokeWidth="9" strokeLinecap="round" /></g>
      </svg>
      <p className="cup-q">{hint}</p>
      <h2 className="cup-h">{mine ? 'Your kick: where do you shoot?' : 'Their kick: where do you dive?'}</h2>
      <div className="cup-tac" role="radiogroup" aria-label={mine ? 'Where to shoot' : 'Where to dive'}>
        {SIDES.map((x) => (
          <button key={x} type="button" role="radio" aria-checked={side === x} className={side === x ? 'on' : ''} onClick={() => setSide(x)}>{SIDE_LABEL[x]}</button>
        ))}
      </div>
      <button type="button" className="cup-btn" disabled={!side} onClick={go}><span>{mine ? 'Take it' : 'Dive'}</span></button>
    </div>
  );
}

/** The cast's silhouette with a quote, for stops. */
export const Speaker = ({ who, quote }: { who: string; quote: string }) => (
  <div className="cup-speaker"><Silhouette size={64} /><p><span className="cup-cap">{who}</span><br />“{quote}”</p></div>
);
