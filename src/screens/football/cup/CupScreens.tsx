// Cup runs, layer 2: "How your deck was dealt", one playable match, penalties and full time (spec §3.5, §4, §13).
// The move cards' look is a first, unapproved version: flat cards in each axis's ink, plainly unlike the player cards.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { buzz } from '../../../audio';
import { longText, ROLE, shortText, TITLE, actsAs } from '../../../football/cup/cards';
import { SIGNATURE, SIDE_WORD, STYLE_NAME, STYLE_TEXT } from '../../../football/cup/clubs';
import type { Deal } from '../../../football/cup/deck';
import {
  blocked, canRecycle, costOf, coverNow, endSpell, lineNow, outcome, play, preview, recycle, shownIntents, TUNE, type MatchState,
} from '../../../football/cup/match';
import { dive, kick, leanOf } from '../../../football/cup/pens';
import { dealToday, endRun, loadRun, saveMatch, startTry, type CupRun } from '../../../football/cup/store';
import { SIDES, type Card, type Side } from '../../../football/cup/types';
import { useSave } from '../../../football/store/hooks';
import { go } from '../../../router';
import { AXIS_INK, valueTier } from '../../../ui/inks';
import { Aurora } from '../FootballHome';

const ink = (c: Card): string => (c.axis ? AXIS_INK[c.axis] : c.kind === 'total' ? '#ffd56a' : '#aab5cf');
/** "One-two ×2, Overlap run". */
const cardList = (cs: Card[]) => [...new Set(cs.map((c) => TITLE[c.kind]))].map((t) => { const k = cs.filter((c) => TITLE[c.kind] === t).length; return k > 1 ? `${t} ×${k}` : t; }).join(', ');
const LEVEL: Record<string, string> = { basic: 'Basic', good: 'Good', great: 'Great', punt: 'Punts' };

/** The entry on Football: says plainly that this is a first try and pays nothing. */
export function CupEntry() {
  const run = useLiveQuery(loadRun, []);
  const live = run && run.match.phase !== 'done' ? run.match : undefined;
  return (
    <section className="fb-card cup-entry" aria-labelledby="cup-entry-h">
      <h2 id="cup-entry-h" className="cup-h">Try a cup match</h2>
      <p className="fb-s">A first try of the cup-run match: one card match against a club from your division, with a deck dealt from your last seven days. It pays nothing and never touches the league.</p>
      <button type="button" className="fb-btn pri" onClick={() => go(live ? '/football/cup/match' : '/football/cup')}>
        {live ? `Back to your match: spell ${live.spell}, ${live.score[0]}–${live.score[1]}` : 'See your deck'}
      </button>
    </section>
  );
}

/** "How your deck was dealt" (spec §3.5), then kick-off; or the match in progress, to resume or abandon. */
export function CupHome() {
  const run = useLiveQuery(loadRun, []);
  const [deal, setDeal] = useState<Deal | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { void dealToday().then(setDeal).catch(() => setErr('Could not read your last seven days.')); }, []);
  if (run === undefined && !deal) return null;
  const live = run && run.match.phase !== 'done' ? run : undefined;
  const kickOff = async () => {
    setBusy(true);
    try { await startTry(); go('/football/cup/match'); } catch { setErr('No club to play yet. Found the club first.'); setBusy(false); }
  };
  return (
    <div className="cup-home">
      <header className="cup-top">
        <button type="button" className="fb-btn sm" onClick={() => go('/football')}>Back</button>
        <h1 className="cup-title">Cup match: a first try</h1>
      </header>
      {live && (
        <section className="fb-card hot">
          <h2 className="cup-h">A match in progress</h2>
          <p className="fb-s">Against {live.match.club.name}, spell {live.match.spell} of {TUNE.spells}, {live.match.score[0]}–{live.match.score[1]}{live.match.phase === 'pens' ? ', penalties' : ''}.</p>
          <div className="cup-row">
            <button type="button" className="fb-btn pri" onClick={() => go('/football/cup/match')}>Resume</button>
            <button type="button" className="fb-btn" onClick={() => void endRun()}>Abandon it</button>
          </div>
        </section>
      )}
      {deal && <DealView deal={live ? live.deal : deal} title={live ? 'The deck this match was dealt' : 'How your deck was dealt'} />}
      {!live && (
        <div className="cup-go">
          <p className="fb-s">One match against a club from your division. A first try of the match only: no map, no rewards, nothing for the league.</p>
          <button type="button" className="fb-btn pri" disabled={busy || !deal} onClick={() => void kickOff()}>Kick off</button>
        </div>
      )}
      {err && <p className="fb-s" role="alert">{err}</p>}
    </div>
  );
}

export function DealView({ deal, title }: { deal: Deal; title: string }) {
  return (
    <section className="cup-deal" aria-label={title}>
      <h2 className="cup-h">{title}</h2>
      <p className="fb-s">Your last seven nights, as the league match scored them. Fifteen or more is great, 11 to 14 good, under 11 basic.</p>
      <ul className="cup-rows">
        {deal.rows.map((r) => (
          <li key={r.axis} className="cup-dr" style={{ '--k': AXIS_INK[r.axis] } as CSSProperties}>
            <span className="cup-ax">{r.axis}</span>
            <b className={`cup-avg ${r.avg != null ? valueTier(r.avg) : 'v1'}`}>{r.avg != null ? (Math.round(r.avg * 10) / 10).toFixed(1) : '–'}</b>
            <span className={`cup-lv lv-${r.level}`}>{LEVEL[r.level]}</span>
            <span className="cup-why">{cardList(r.cards)}. {r.why}</span>
          </li>
        ))}
        {deal.extras.map((e) => (
          <li key={e.card.id} className="cup-dr extra" style={{ '--k': ink(e.card) } as CSSProperties}>
            <span className="cup-ax">Extra</span>
            <span className="cup-lv">{e.card.name ? e.card.name : TITLE[e.card.kind]}</span>
            <span className="cup-why">{e.why}</span>
          </li>
        ))}
      </ul>
      <p className="fb-s">{deal.cards.length} cards in all.</p>
    </section>
  );
}

// --- the match ----------------------------------------------------------------------------------------------------
export function CupMatchRoute() {
  const run = useLiveQuery(async () => (await loadRun()) ?? null, []);
  if (run === undefined) return null;
  if (!run) return <div className="cup-home"><p className="fb-s">No cup match in progress.</p><button type="button" className="fb-btn pri" onClick={() => go('/football/cup')}>See your deck</button></div>;
  return <CupMatch key={run.startedAt} run={run} />;
}

function CupMatch({ run }: { run: CupRun }) {
  const save = useSave();
  const [s, setS] = useState<MatchState>(run.match);
  const [recycling, setRecycling] = useState(false);
  const [read, setRead] = useState<Card | null>(null);
  const [wild, setWild] = useState<Card | null>(null);
  const [about, setAbout] = useState(false);
  const feel = save?.buzz !== false;
  const commit = (n: MatchState) => {
    if (n === s) return;
    setS(n);
    void saveMatch(n);
    if (!feel) return;
    if (n.last.some((f) => f.kind === 'goal')) buzz([60, 40, 60, 40, 220]);
    else if (n.last.some((f) => f.kind === 'conceded')) buzz([200]);
    else if (n.zone > s.zone || n.build > s.build) buzz(18);
  };
  const tap = (c: Card) => {
    if (recycling) {
      const n = recycle(s, c.id);
      commit(n);
      if (!canRecycle(n)) setRecycling(false);
      return;
    }
    if (c.kind === 'total') { setWild(c); return; }
    commit(play(s, c.id));
  };
  if (s.phase === 'pens') return <Pens s={s} commit={commit} />;
  if (s.phase === 'done') return <FullTimeCup s={s} />;
  const intents = shownIntents(s);
  const line = lineNow(s);
  return (
    <div className="cup-match">
      <header className="cup-score" aria-label="Score">
        <span className="cup-team">You</span>
        <b className="cup-goals" aria-live="polite">{s.score[0]}–{s.score[1]}</b>
        <span className="cup-team them" style={{ '--k': s.club.colours[0] } as CSSProperties}>{s.club.short}</span>
        <span className="cup-spell">Spell {s.spell} of {TUNE.spells}</span>
      </header>
      <section className="cup-them" aria-label="The other club">
        <button type="button" className="cup-club" onClick={() => setAbout(true)}>
          <b>{s.club.name}</b>
          <span className="fb-s">{STYLE_NAME[s.club.style]}{s.club.elite ? ` · ${SIGNATURE[s.club.elite].name}` : ''}{s.club.scouted ? ' · scouted' : ''} · how they play</span>
        </button>
        <div className="cup-nums">
          <span className="cup-num"><small>Their line</small><b>{line}</b></span>
          <span className="cup-num threat"><small>Threat</small><b>{intents[0]?.threat ?? 0}</b></span>
          <span className="cup-num cover"><small>Your cover</small><b>{coverNow(s)}</b></span>
        </div>
        <p className="cup-ahead">{intents[0]?.threat ? `Coming: ${intents[0].kind.toLowerCase()}.` : 'No attack this spell.'}{intents.length > 1 ? ` Then ${intents.slice(1).map((x) => (x.threat ? `${x.threat}` : 'none')).join(', ')}.` : ''}</p>
      </section>
      <Pitch s={s} />
      <div className="cup-bar">
        <span className="cup-fit"><span>Stamina <b className="cup-st">{s.stamina}</b></span><span>Fitness {s.fitness}</span></span>
        <button type="button" className={`fb-btn sm ${recycling ? 'pri' : ''}`} disabled={!recycling && !canRecycle(s)} aria-pressed={recycling} onClick={() => setRecycling(!recycling)}>
          {recycling ? 'Done' : `Recycle${s.freeRecycles ? ` (${s.freeRecycles} free)` : ''}`}
        </button>
        <button type="button" className="fb-btn sm" onClick={() => { setRecycling(false); commit(endSpell(s)); }}>End spell</button>
      </div>
      {recycling && <p className="cup-hint">Tap a card to drop it and draw another. {s.freeRecycles ? 'Free.' : 'Costs 1 stamina.'}</p>}
      <Hand s={s} recycling={recycling} onTap={tap} onRead={setRead} />
      {s.inPlay.length > 0 && <p className="cup-hint">In play: {s.inPlay.map((c) => `${TITLE[c.kind]} (${shortText(c.kind, c.level)})`).join(', ')}</p>}
      {read && <Sheet onClose={() => setRead(null)} title={read.name ?? TITLE[read.kind]}><p>{longText(read)}</p>{blocked(s, read.id) && read.kind !== 'total' && <p className="fb-s">Now: {blocked(s, read.id)}</p>}</Sheet>}
      {about && (
        <Sheet onClose={() => setAbout(false)} title={s.club.name}>
          <p><b>{STYLE_NAME[s.club.style]}.</b> {STYLE_TEXT[s.club.style]}</p>
          {s.club.elite && <p><b>{SIGNATURE[s.club.elite].name}.</b> {SIGNATURE[s.club.elite].text}</p>}
          <p className="fb-s">{s.club.scouted ? 'Scouted: you have met them in the league, so you see their attacks two spells ahead and their penalty habits.' : 'Not scouted: meet them in the league to see their attacks two spells ahead.'}</p>
          <p className="fb-s">A chance at or above their line is a goal; at half the line or more, a near miss that lowers it. Their attack short of your cover by 1 to {TUNE.shortMax} costs fitness; by more, they score.</p>
        </Sheet>
      )}
      {wild && (
        <Sheet onClose={() => setWild(null)} title="Total football plays as…">
          <div className="cup-wild">
            {s.basics.map((k) => (
              <button key={k} type="button" className="fb-btn" disabled={!!blocked(s, wild.id, k)} onClick={() => { commit(play(s, wild.id, k)); setWild(null); }}>
                {TITLE[k]}: {shortText(k, 'basic')}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}

const ZONES = ['Your third', 'Midfield', 'Final third'];
function Pitch({ s }: { s: MatchState }) {
  const toasts = s.last.filter((f) => f.kind !== 'spell');
  return (
    <section className="cup-pitch" aria-label={`The ball is in ${ZONES[s.zone].toLowerCase()}. Build-up ×${s.build}.`}>
      {[2, 1, 0].map((z) => (
        <div key={z} className={`cup-zone ${s.zone === z ? 'on' : ''}`}>
          <span className="cup-zl">{ZONES[z]}</span>
          {s.zone === z && <span className="cup-ball" aria-hidden="true" />}
        </div>
      ))}
      <span className="cup-build">Build-up <b>×{s.build}</b></span>
      <div className="cup-toasts" aria-live="polite">
        {toasts.map((f, i) => <p key={`${s.feed.length}-${i}`} className={`cup-toast k-${f.kind}`}>{f.text}</p>)}
      </div>
    </section>
  );
}

const HOLD_MS = 450;
function Hand({ s, recycling, onTap, onRead }: { s: MatchState; recycling: boolean; onTap: (c: Card) => void; onRead: (c: Card) => void }) {
  const timer = useRef<number | undefined>(undefined);
  const held = useRef(false);
  const down = (c: Card) => { held.current = false; timer.current = window.setTimeout(() => { held.current = true; onRead(c); }, HOLD_MS); };
  const cancel = () => window.clearTimeout(timer.current);
  return (
    <section className="cup-hand" aria-label="Your hand. Tap to play, press and hold to read.">
      {s.hand.length === 0 && <p className="fb-s">No cards left this spell. End the spell.</p>}
      {s.hand.map((c) => {
        const why = c.kind === 'total' ? (s.basics.some((k) => !blocked(s, c.id, k)) ? null : 'Nothing to play as') : blocked(s, c.id);
        const off = recycling ? false : !!why;
        const pv = !recycling && ROLE[actsAs(c).kind] === 'finish' ? preview(s, c.id) : null;
        const act = actsAs(c);
        return (
          <button
            key={c.id} type="button" className={`cup-card ${off ? 'off' : ''} ${recycling ? 'drop' : ''} lv-${c.level}`}
            style={{ '--k': ink(c) } as CSSProperties}
            aria-label={`${c.name ?? TITLE[c.kind]}, ${c.level}. ${shortText(act.kind, act.level)}.${off && why ? ` ${why}` : ''}`}
            onPointerDown={() => down(c)} onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel}
            onContextMenu={(e) => e.preventDefault()}
            onClick={() => { cancel(); if (held.current) { held.current = false; return; } if (!off) onTap(c); }}
          >
            <span className="cup-cost" aria-hidden="true">{costOf(s, c)}</span>
            <span className="cup-ct">{c.name && c.kind !== 'loan' ? c.name : TITLE[c.kind]}</span>
            <span className="cup-cx">{c.kind === 'loan' ? `${c.name}: ${shortText(act.kind, 'great')}` : shortText(c.kind, c.level)}</span>
            {pv && <span className={`cup-pv k-${pv.kind}`}>{pv.chance} v {pv.line}</span>}
            {recycling && <span className="cup-pv">Drop</span>}
            <span className="cup-lvl">{c.axis ?? (c.kind === 'total' ? 'Wild' : 'Punt')} · {c.level}</span>
          </button>
        );
      })}
    </section>
  );
}

function Sheet({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  // On the page body, above the tab bar: the Football page is its own layer.
  return createPortal(
    <div className="cup-sheet-bg" onClick={onClose}>
      <div className="cup-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h2 className="cup-h">{title}</h2>
        {children}
        <button type="button" className="fb-btn" onClick={onClose}>Close</button>
      </div>
    </div>,
    document.body,
  );
}

const aimWord = (x: Side) => (x === 'centre' ? 'down the middle' : x);
const diveWord = (x: Side) => (x === 'centre' ? 'stayed in the middle' : `dived ${x}`);
function Pens({ s, commit }: { s: MatchState; commit: (n: MatchState) => void }) {
  const p = s.pens!;
  const mine = p.turn === 'us';
  const last = p.kicks[p.kicks.length - 1];
  const dots = (xs: boolean[]) => Array.from({ length: Math.max(5, xs.length) }, (_, i) => <i key={i} className={i < xs.length ? (xs[i] ? 'in' : 'out') : ''} />);
  return (
    <div className="cup-match cup-pens">
      <header className="cup-score"><span className="cup-team">You</span><b className="cup-goals">{s.score[0]}–{s.score[1]}</b><span className="cup-team them">{s.club.short}</span><span className="cup-spell">Penalties</span></header>
      <section className="cup-tally" aria-label={`Penalties: you ${p.us.filter(Boolean).length}, them ${p.them.filter(Boolean).length}`}>
        <p><span>You</span><span className="cup-dots">{dots(p.us)}</span></p>
        <p><span>{s.club.short}</span><span className="cup-dots">{dots(p.them)}</span></p>
      </section>
      {last && <p className="cup-toast" aria-live="polite">{last.who === 'us' ? `You shot ${aimWord(last.aim)}, the keeper ${diveWord(last.dive)}: ${last.scored ? 'goal' : last.dive === last.aim ? 'saved' : 'wide'}.` : `They shot ${aimWord(last.aim)}, you ${diveWord(last.dive)}: ${last.scored ? 'goal' : 'saved'}.`}</p>}
      <h2 className="cup-h">{mine ? 'Your kick: where do you shoot?' : 'Their kick: where do you dive?'}</h2>
      <p className="fb-s">{s.club.scouted ? (mine ? `Scouted: their keeper tends to dive ${SIDE_WORD[leanOf(p.keeper)]}.` : `Scouted: their takers like ${SIDE_WORD[leanOf(p.takers)]}.`) : 'Not scouted: you have not met them in the league, so their habits are hidden.'}</p>
      <div className="cup-goalmouth">
        {SIDES.map((side: Side) => (
          <button key={side} type="button" className="fb-btn" onClick={() => { const n = mine ? kick(s, side) : dive(s, side); commit(n); }}>
            {side === 'centre' ? 'Middle' : side === 'left' ? 'Left' : 'Right'}
          </button>
        ))}
      </div>
    </div>
  );
}

function FullTimeCup({ s }: { s: MatchState }) {
  const o = outcome(s);
  const [busy, setBusy] = useState(false);
  const p = s.pens;
  const combos = s.feed.filter((f) => f.kind === 'combo').length;
  return (
    <div className="cup-match cup-ft">
      <p className="cup-spell">Full time</p>
      <h1 className={`cup-result ${o === 'W' ? 'w' : 'l'}`}>{o === 'W' ? 'You win' : 'You lose'}</h1>
      <p className="cup-final">You {s.score[0]}–{s.score[1]} {s.club.name}{p ? `, ${p.us.filter(Boolean).length}–${p.them.filter(Boolean).length} on penalties` : ''}</p>
      <p className="fb-s">{combos} combination{combos === 1 ? '' : 's'} landed. Fitness {s.fitness} of {TUNE.fitness}.</p>
      <p className="fb-s">This was a first try of the cup match. It pays nothing and the league is untouched.</p>
      <div className="cup-row">
        <button type="button" className="fb-btn pri" disabled={busy} onClick={async () => { setBusy(true); await startTry(); setBusy(false); }}>Play another</button>
        <button type="button" className="fb-btn" onClick={async () => { await endRun(); go('/football'); }}>Back to Football</button>
      </div>
      <details className="cup-log">
        <summary>How the match went</summary>
        <ol>{s.feed.filter((f) => f.kind !== 'spell').map((f, i) => <li key={i}>Spell {f.spell}: {f.text}</li>)}</ol>
      </details>
    </div>
  );
}

/** The route shell: the aurora behind every cup screen. */
export function CupRoute({ match }: { match: boolean }) {
  return (
    <Aurora>
      <main className="fb-page cup-page">{match ? <CupMatchRoute /> : <CupHome />}</main>
    </Aurora>
  );
}
