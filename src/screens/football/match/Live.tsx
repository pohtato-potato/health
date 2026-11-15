// Matchday depth (spec 2026-11-12 §3): watching the waiting league match. Before kick-off (lg-pre), live on the
// radar-as-stadium (r3-live), a call (r3-call), a goal (lg-goal), half-time (lg-half), then full time. Every number
// here comes from the same rebuilt input the store finishes with, so what you watch is what is stored.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { db } from '../../../db/db';
import { clubCrest, crestSvg } from '../../../football/art/crest';
import { clubById, STYLES, TIER_NAMES } from '../../../football/data/load';
import { nextChance, startMatch, type CallOffer, type MatchState } from '../../../football/engine';
import { weakSide, type Width } from '../../../football/matchday';

const WEAK_CHIP: Record<Width, string> = { left: 'Weak down their left', middle: 'Weak through the middle', right: 'Weak down their right' };
import { creditsFor } from '../../../football/players/credit';
import { TACTIC_NAME, TACTICS, type Tactic } from '../../../football/rotation/night';
import { useSave } from '../../../football/store/hooks';
import { pausedInput, planFor, readFor } from '../../../football/store/paused';
import { finishPaused, recordLive } from '../../../football/store/play';
import type { FbSave, PausedMatch, StoredMatch } from '../../../football/store/tables';
import type { CallPick, ChanceEvent } from '../../../football/types';
import { AXIS_INK } from '../../../ui/inks';
import { go } from '../../../router';
import { Aurora, FootballHome } from '../FootballHome';
import { FullTime } from '../FullTime';
import { Art } from '../Tonight';
import { PlayerCard } from '../players/Card';
import { buzz } from '../Match';
import { ElevenDots, MomentumStrip, moveChain, oddsChips, pctInk, PlanPanel, ShotMap } from './MatchBits';
import { Action, Chip, HelpButton, Panel } from '../../../ui/kit/Kit';
import { CALL_HOW, MATCH_HOW } from '../howDaily';
import { Gremlin, Pundit } from '../Studio';
import '../../../styles/look-tonight.css';
import { Pitch } from './Pitch';

const run = (st: MatchState) => { while (nextChance(st)) { /* to the next stop */ } return st; };
const isGoal = (c: ChanceEvent) => !c.kept && (c.side === 'atk' ? c.ok : !c.ok);

/** /football/match?live=1: the waiting match, from before kick-off to full time. */
export function LiveRoute() {
  const save = useSave();
  const [stage, setStage] = useState<'pre' | 'play'>('pre');
  const [done, setDone] = useState<StoredMatch | null>(null);
  if (save === undefined) return null;
  if (done) return <FootballHome section="tonight"><FullTime m={done} save={save!} /></FootballHome>;
  const p = save?.paused;
  if (!save || !p) return <FootballHome section="tonight"><p className="fb-s">No match is waiting to be watched.</p><button type="button" className="fb-btn" onClick={() => go('/football')}>Back to Football</button></FootballHome>;
  const end = async () => { const m = await finishPaused({ watched: true }); if (m) { setDone(m); window.scrollTo(0, 0); } };
  if (stage === 'pre' && !p.picks.length && !p.halfSeen) return <PreKickOff p={p} save={save} onKickOff={() => setStage('play')} onSkip={end} />;
  return <LivePlay p={p} save={save} onEnd={end} />;
}

/** One match screen: it fills the screen above the tab bar and never scrolls, its one action at the foot. */
function Fit({ className, children, label }: { className?: string; children: ReactNode; label?: string }) {
  return (
    <Aurora className={`mt-page lt-fitpage ${className ?? ''}`}>
      <main className="fb-page lt-fit" aria-label={label}>{children}</main>
    </Aurora>
  );
}

/** Before kick-off (lg-pre). */
export function PreKickOff({ p, save, onKickOff, onSkip }: { p: PausedMatch; save: FbSave; onKickOff: () => void; onSkip: () => void }) {
  const opp = clubById(p.prep.oppId);
  const row = useLiveQuery(() => db.fbClubs.get(p.prep.oppId), [p.prep.oppId]);
  const rating = row?.rating ?? opp.rating ?? 50;
  const tier = row?.tier ?? opp.tier;
  const gap = p.prep.braboTier - tier;
  const read = readFor(p, save);
  const plan = planFor(save, p.date, p.prep.tactic.pick);
  const tactic = save.tactics?.[p.date] ? { pick: save.tactics[p.date], by: 'you' as const } : p.prep.tactic;
  const style = STYLES[p.style];
  return (
    <Fit className="lt-pre" label="Before kick-off">
      <div className="lt-mtop">
        <span className="lt-cap">Last night · {TIER_NAMES[String(p.prep.braboTier)] ?? `Division ${p.prep.braboTier}`}{p.prep.matchday ? ` · matchday ${p.prep.matchday}` : ''} · {p.prep.braboHome ? 'home' : 'away'}</span>
        <HelpButton how={MATCH_HOW} />
      </div>
      <div className="md-opp">
        <Art svg={clubCrest(opp, 48)} />
        <span><b className="md-oname">{opp.name}</b><span className="k-q">Rated {Math.round(rating)}{gap ? ` · ${Math.abs(gap)} division${Math.abs(gap) === 1 ? '' : 's'} ${gap > 0 ? 'above' : 'below'} you` : ' · your division'}</span></span>
      </div>
      <div className="k-chips">
        {opp.known.slice(0, 2).map((a) => <Chip key={a.name} ink="#ff9a76">{a.name}</Chip>)}
        {style?.say && <Chip ink="#93c3dc">{style.say}</Chip>}
        {read.weakKnown && <Chip ink="#8fdcb6">{WEAK_CHIP[weakSide(p.prep.oppId)]}</Chip>}
      </div>
      <PlanPanel date={p.date} tactic={tactic} plan={plan} read={read} xi={[]} cards={save.tacticCards ?? []} compact />
      <div className="lt-eleven"><span className="lt-cap">Your eleven</span><ElevenDots xi={p.prep.xi} /></div>
      <div className="lt-foot">
        <Action wide onClick={onKickOff}>Kick off</Action>
        <button type="button" className="lt-skip" onClick={onSkip}>Skip to the result</button>
      </div>
    </Fit>
  );
}

type Phase = 'enter' | 'shot' | 'result';
const MS: Record<Phase, number> = { enter: 1800, shot: 1300, result: 1400 };

/** The score with both crests, big in the middle, and the clock under it: what leads every match screen. */
function Scoreboard({ p, save, score, minute, label }: { p: PausedMatch; save: FbSave; score: [number, number]; minute?: number; label?: ReactNode }) {
  const opp = clubById(p.prep.oppId);
  const own = <Art svg={crestSvg(save.crest.step, save.crest.opt, 34)} />, them = <Art svg={clubCrest(opp, 34)} />;
  const name = opp.short || opp.name;
  const [l, r] = p.prep.braboHome ? [['Brabo', own, score[0]], [name, them, score[1]]] as const : [[name, them, score[1]], ['Brabo', own, score[0]]] as const;
  return (
    <header className="lt-board" aria-label={`${l[0]} ${l[2]}, ${r[0]} ${r[2]}${minute !== undefined ? `, ${minute} minutes` : ''}`}>
      <span className="lt-side">{l[1]}<b>{l[0]}</b></span>
      <b className="lt-score" key={`${score[0]}-${score[1]}`}>{l[2]}<i>–</i>{r[2]}</b>
      <span className="lt-side r"><b>{r[0]}</b>{r[1]}</span>
      {(minute !== undefined || label) && <span className="lt-clock">{label ?? <><b>{minute}′</b> of 90</>}</span>}
    </header>
  );
}

/** Live (r3-live), with the calls, the goals and half-time as they come. */
function LivePlay({ p, save, onEnd }: { p: PausedMatch; save: FbSave; onEnd: () => void }) {
  const st = useMemo(() => run(startMatch(pausedInput(p, save, { watch: true }))), [p, save]);
  // Leaving mid-match and coming back picks up at the last decision you made.
  const [k, setK] = useState(() => {
    const last = p.picks.length ? (st.made[p.picks.length - 1]?.slot ?? 0) : 0;
    const half = p.halfSeen ? st.chances.findIndex((c) => c.minute > 45) : -1;
    return Math.max(0, last, half);
  });
  const [phase, setPhase] = useState<Phase>('enter');
  const [goal, setGoal] = useState<number | null>(null);
  // One tap per decision: the screen waits for the stored answer before it moves on.
  const [busy, setBusy] = useState(false);
  useEffect(() => setBusy(false), [p]);
  const once = (f: () => Promise<void>) => { if (busy) return; setBusy(true); void f(); };
  const c = st.chances[k];
  const credits = useMemo(() => creditsFor({ seed: p.input.seed, chances: st.chances, score: [0, 0], xg: [0, 0], moments: [] }, p.prep.xi, clubById(p.prep.oppId).name, undefined, p.prep.setPiece), [st, p]);
  useEffect(() => {
    if (!c || goal !== null) return;
    const t = setTimeout(() => {
      if (c.kept) { setK(k + 1); setPhase('enter'); return; }
      if (phase === 'enter') setPhase('shot');
      else if (phase === 'shot') {
        setPhase('result');
        if (isGoal(c)) { buzz(save.buzz, c.side === 'atk' ? [60, 40, 120] : 80); setGoal(k); }
      } else { setK(k + 1); setPhase('enter'); }
    }, MS[phase]);
    return () => clearTimeout(t);
  }, [c, k, phase, goal, save.buzz]);
  const upTo = st.chances.slice(0, c ? k + (phase === 'result' ? 1 : 0) : k);
  const score: [number, number] = [upTo.filter((x) => x.side === 'atk' && x.ok && !x.kept).length, upTo.filter((x) => x.side === 'def' && !x.ok).length];
  const minute = c ? c.minute : st.stop?.kind === 'half' ? 45 : st.stop?.kind === 'call' ? st.stop.offer.minute : 90;

  if (goal !== null) return <GoalView c={st.chances[goal]} p={p} save={save} score={score} credit={credits.find((x) => x.i === goal)} onOn={() => { setGoal(null); setK(goal + 1); setPhase('enter'); }} />;
  if (!c) {
    if (st.stop?.kind === 'call') return <CallView offer={st.stop.offer} p={p} save={save} chances={st.chances} onPick={(pick) => once(() => recordLive({ pick }))} />;
    if (st.stop?.kind === 'half') return <HalfView p={p} save={save} chances={st.chances} score={score} onGo={(half2) => once(() => recordLive({ halfSeen: true, half2 }))} />;
    // The final whistle (lg-full's first beat): the score, the ninety minutes as a strip and a map, then full time.
    const won = score[0] > score[1], lost = score[0] < score[1];
    return (
      <Fit className={`lt-whistle ${won ? 'w' : lost ? 'l' : 'd'}`} label="Full time">
        <Scoreboard p={p} save={save} score={score} label={<b>Full time</b>} />
        <p className="lt-word">{won ? 'A win.' : lost ? 'A defeat.' : 'A draw.'}</p>
        <MomentumStrip chances={st.chances} />
        <div className="lt-map"><ShotMap chances={st.chances} /></div>
        <div className="lt-foot"><Action wide onClick={onEnd}>See full time</Action></div>
      </Fit>
    );
  }
  const chain = moveChain(c, k, p.prep.xi, credits.find((x) => x.i === k)?.name);
  const chips = oddsChips(c.mods, c.type);
  return (
    <Fit className={`md-live lt-live ${c.side}`} label="The match, live">
      <Scoreboard p={p} save={save} score={score} minute={minute} />
      <MomentumStrip chances={upTo} upTo={minute} />
      <div className="md-stadium lt-stadium">
        <i className="lt-flood" aria-hidden="true" />
        <Pitch s={{ chance: c, ball: phase === 'enter' ? undefined : c.land, flying: phase === 'shot', zoom: false, save: phase === 'result' && c.side === 'def' && c.ok, resultKey: k }} dots={st.chances.slice(0, k)} entry={phase !== 'enter'} />
      </div>
      <div className="lt-now" key={k}>
        {chain.length > 0 && (
          <ol className="md-chain" aria-label="The move">
            {chain.map((n, i) => <li key={n} className={i === chain.length - 1 ? 'last' : undefined}>{n}</li>)}
          </ol>
        )}
        <div className="k-row lt-chance">
          <span className="k-col"><span className="lt-cap">{c.minute}′ · {c.type}</span>{phase === 'result' ? <b className={`lt-res ${isGoal(c) ? (c.side === 'atk' ? 'g' : 'x') : ''}`}>{isGoal(c) ? (c.side === 'atk' ? 'Goal!' : 'They score.') : c.side === 'atk' ? 'It stays out.' : 'Stopped.'}</b> : <span className="k-q">{c.side === 'atk' ? 'Your chance' : 'Their chance'}</span>}</span>
          <span className="lt-pct"><b className="fb-num" style={pctInk(c.pct)}>{c.pct}%</b><span className="k-q">{c.side === 'atk' ? 'to score' : 'to stop it'}</span></span>
        </div>
        {chips.length > 0 && <div className="lt-chips">{chips.map((x) => <Chip key={x.text} ink={AXIS_INK[x.axis]}>{x.text}</Chip>)}</div>}
      </div>
      <div className="lt-foot"><button type="button" className="lt-skip" onClick={onEnd}>Skip to the result</button></div>
    </Fit>
  );
}

const SITUATION: Record<string, string> = {
  'Counter-attack': 'A break is on. {opp} are stretched.',
  'Set piece': 'A free kick in a good spot.',
  'Through ball': 'A gap opens between their lines.',
  'Tap-in': 'The ball drops loose in their box.',
};
const TAKE_LABEL: Record<string, string> = { 'Counter-attack': 'Run at them', 'Set piece': 'Go for the set piece', 'Through ball': 'Thread it through', 'Tap-in': 'Get bodies in the box' };
const fair = (pct: number) => (pct >= 55 ? 'A good chance.' : pct >= 30 ? 'A fair chance.' : 'A long way out.');

/** A call (r3-call): three options stacked, each a full filled choice in its axis ink, saying what it risks. */
export function CallView({ offer, p, save, chances, onPick }: { offer: CallOffer; p: PausedMatch; save: FbSave; chances: ChanceEvent[]; onPick: (pick: CallPick) => void }) {
  const opp = clubById(p.prep.oppId);
  const take = offer.options[0], shoot = offer.options[1], keep = offer.options[2];
  const opts: { pick: CallPick; ink: string; name: string; line: string; odds: ReactNode; style?: CSSProperties }[] = [
    { pick: 'take', ink: AXIS_INK[take.axis!], name: TAKE_LABEL[take.type!] ?? 'Take it on', line: `${take.axis} takes it on. ${fair(take.pct)}`, odds: `${take.pct}%`, style: pctInk(take.pct) },
    { pick: 'shoot', ink: AXIS_INK.Power, name: 'Shoot on sight', line: 'From range. Unlikely, but a screamer if it lands.', odds: `${shoot.pct}%`, style: pctInk(shoot.pct) },
    { pick: 'keep', ink: AXIS_INK.Routine, name: 'Keep the ball', line: keep.pct ? `No chance now. Their next attack is ${keep.pct} points easier to stop.` : 'No chance now. They have no attack left to stop.', odds: 'Safe', style: { color: '#8fdcb6' } },
  ];
  return (
    <Fit className="md-callpage lt-call" label={`Call ${offer.n} of ${offer.of}`}>
      <Scoreboard p={p} save={save} score={offer.score} label={<><b>{offer.minute}′</b> · call {offer.n} of {offer.of}</>} />
      <MomentumStrip chances={chances} upTo={offer.minute} />
      <div className="lt-ask">
        <h2 className="md-ask">{(SITUATION[take.type!] ?? 'A chance is on.').replace('{opp}', opp.short || opp.name)} What do you shout?</h2>
        <HelpButton how={CALL_HOW} />
      </div>
      <div className="mt-opts lt-opts">
        {opts.map((o, i) => (
          <button key={o.pick} type="button" className="mt-opt lt-opt" style={{ ['--ink' as string]: o.ink, ['--i' as string]: i } as CSSProperties} onClick={() => onPick(o.pick)}>
            <span><b style={{ color: o.ink }}>{o.name}</b><small>{o.line}</small></span>
            <b className="fb-num md-odds" style={o.style}>{o.odds}</b>
          </button>
        ))}
      </div>
      <p className="k-q lt-note">The odds come from tonight’s numbers. If you are not watching, your assistant takes the best odds.</p>
    </Fit>
  );
}

/** A goal (lg-goal): the page takes the scoring club's colours; Brabo's goals show the scorer's card. */
function GoalView({ c, p, save, score, credit, onOn }: { c: ChanceEvent; p: PausedMatch; save: FbSave; score: [number, number]; credit?: { player: string; name: string; unit: string }; onOn: () => void }) {
  const ours = c.side === 'atk';
  const opp = clubById(p.prep.oppId);
  const player = useLiveQuery(async () => (ours && credit ? (await db.fbPlayers.get(credit.player)) ?? null : null), [credit?.player]);
  const screamer = ours && c.type === 'Long shot' && c.pct < 20;
  const colours = ours ? ['#ff8a3d', '#c2b2ff'] : [opp.colours[0] ?? '#7fb8ff', opp.colours[1] ?? '#141414'];
  return (
    <Aurora className={`mt-page lt-fitpage md-goal lt-goal ${ours ? 'ours' : 'theirs'}`} a={colours[0]} c={colours[1]}>
      <main className="fb-page lt-fit" role="alert">
        <span className="lt-cap">{c.minute} minutes</span>
        <b className="md-gword">{ours ? 'GOAL' : 'They score'}</b>
        <span className="md-tag">{screamer ? `SCREAMER · ${c.pct}% and in` : ours ? `${c.type} · ${c.pct}% and in` : `${c.type} · ${c.pct}% to stop it`}</span>
        {ours && credit && (
          <div className="md-scorer">
            {player && <div className="mt-card"><PlayerCard card={player.card} art={player.art} seed={player.id} player={player} /></div>}
            <span><b className="md-oname">{credit.name}</b><span className="k-q">{credit.unit}</span></span>
          </div>
        )}
        {!ours && <Art svg={clubCrest(opp, 72)} className="md-gcrest" />}
        <div className="md-stadium sm lt-stadium"><Pitch s={{ chance: c, ball: c.land, flying: false, zoom: false, save: false, resultKey: 0 }} /></div>
        <Scoreboard p={p} save={save} score={score} />
        <div className="lt-foot"><Action wide onClick={onOn}>Carry on</Action></div>
      </main>
    </Aurora>
  );
}

/** Half-time (lg-half): the studio, the shot map so far, and a chance to change the plan. */
export function HalfView({ p, save, chances, score, onGo }: { p: PausedMatch; save: FbSave; chances: ChanceEvent[]; score: [number, number]; onGo: (half2: Tactic | null) => void }) {
  const plan = planFor(save, p.date, p.prep.tactic.pick);
  const [pick, setPick] = useState<Tactic>(p.half2 ?? plan.tactic ?? p.prep.tactic.pick);
  const shots = chances.filter((c) => !c.kept);
  const xg = [shots.filter((c) => c.side === 'atk').reduce((t, c) => t + c.pct / 100, 0), shots.filter((c) => c.side === 'def').reduce((t, c) => t + 1 - c.pct / 100, 0)];
  const n = [shots.filter((c) => c.side === 'atk').length, shots.filter((c) => c.side === 'def').length];
  const lines = halfLines(p, chances, score);
  return (
    <Fit className="lt-half" label="Half-time">
      <Scoreboard p={p} save={save} score={score} label={<><b>Half-time</b> · in the studio</>} />
      <div className="lt-voice g"><Gremlin /><span><b>The Gremlin</b><span>{lines[0]}</span></span></div>
      <div className="lt-voice p"><Pundit /><span><b>The pundit</b><span>{lines[1]}</span></span></div>
      <Panel className="lt-map"><ShotMap chances={chances} label="Shot map so far" />
        <div className="k-row"><span className="k-q">Chances</span><b className="fb-num">{n[0]} v {n[1]}</b></div>
        <div className="k-row"><span className="k-q">Expected goals</span><b className="fb-num">{xg[0].toFixed(1)} v {xg[1].toFixed(1)}</b></div>
      </Panel>
      <span className="lt-cap">Change the plan?</span>
      <div className="md-seg3">
        {TACTICS.map((t) => <button key={t} type="button" className={pick === t ? 'on' : undefined} aria-pressed={pick === t} onClick={() => setPick(t)}>{TACTIC_NAME[t]}</button>)}
      </div>
      <div className="lt-foot"><Action wide onClick={() => onGo(pick === (plan.tactic ?? p.prep.tactic.pick) ? null : pick)}>Second half</Action></div>
    </Fit>
  );
}

/** A Gremlin line and a pundit line about this match's first half (no time of any log, only tonight's numbers). */
function halfLines(p: PausedMatch, chances: ChanceEvent[], score: [number, number]): [string, string] {
  const opp = clubById(p.prep.oppId);
  const name = opp.short || opp.name;
  const theirs = chances.filter((c) => c.side === 'def' && !c.kept);
  const kinds = new Map<string, number>();
  for (const c of theirs) kinds.set(c.type, (kinds.get(c.type) ?? 0) + 1);
  const main = [...kinds].sort((a, b) => b[1] - a[1])[0]?.[0];
  const v = p.prep.values;
  const low = (Object.keys(v) as (keyof typeof v)[]).reduce((a, b) => (v[b] < v[a] ? b : a));
  const grem = score[0] > score[1] ? `Ahead at the break. Nobody touch anything. Especially not ${low}.`
    : score[0] < score[1] ? `Behind at the break, and ${low} is on ${v[low]}. I am not saying it is connected. I am thinking it.`
    : `Level. ${low} on ${v[low]} is holding this together with tape.`;
  const pundit = main ? `${name} keep coming with the ${main.toLowerCase()}. That is where the second half is decided.` : `${name} have barely had a sniff. The second half is Brabo's to lose.`;
  return [grem, pundit];
}
