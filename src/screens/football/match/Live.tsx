// Matchday depth (spec 2026-11-12 §3): watching the waiting league match. Before kick-off (lg-pre), live on the
// radar-as-stadium (r3-live), a call (r3-call), a goal (lg-goal), half-time (lg-half), then full time. Every number
// here comes from the same rebuilt input the store finishes with, so what you watch is what is stored.
import { bugShort, CameraScene, MoveScene, ScoreBug, type BugSide } from './Broadcast';
import { BRABO_INK } from '../../../ui/inks';
import { lossInkOf } from '../Chance';
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
import { Board, clubName, ElevenDots, MomentumStrip, moveChain, oddsChips, pctInk, PlanPanel, ShotMap, type BoardSide } from './MatchBits';
import { OWN } from '../../../football/store/season';
import '../../../styles/match-screen.css';
import { Action, Chip, HelpButton, Panel } from '../../../ui/kit/Kit';
import { CALL_HOW, MATCH_HOW } from '../howDaily';
import { Gremlin, Pundit } from '../Studio';
import '../../../styles/look-tonight.css';
import { CallPitch, Pitch, RollWord, ShapeKey } from './Pitch';
import { firstLandingOk } from './Replay';
import { roll, rollSeed } from './roll';

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

// A chance: the move comes in, the ball rolls (O44; a retake rolls again after "Chance 2 of 2"), then the result.
// A shot lasts as long as its roll; a goal-line roll's result holds for the verdict and the close-up easing back,
// and a goal shows its verdict and burst on the pitch before the goal screen.
type Phase = 'enter' | 'shot' | 'retry' | 'shot2' | 'result';
const MS = { enter: 1800, retry: 1800, result: 1400, lineResult: 2600, goal: 1000, lineGoal: 1800 };

/** The score with both crests and names, the numbers as flip tiles, and the clock under it: what leads every match screen. */
/** The score bug (m15-pitch): home club first, with the fixture's words beside the clock. */
function LiveBug({ p, save, score, minute }: { p: PausedMatch; save: FbSave; score: [number, number]; minute: number }) {
  const opp = clubById(p.prep.oppId);
  const own: BugSide = { name: 'Brabo', short: 'BRA', crest: crestSvg(save.crest.step, save.crest.opt, 34), n: score[0], ours: true };
  const them: BugSide = { name: clubName(opp.id), short: bugShort(clubName(opp.id)), crest: clubCrest(opp, 34), n: score[1], ours: false };
  const where = [TIER_NAMES[String(p.prep.braboTier)], p.prep.matchday ? `Matchday ${p.prep.matchday}` : undefined, p.prep.braboHome ? 'home' : 'away'].filter(Boolean).join(' · ');
  return <ScoreBug sides={p.prep.braboHome ? [own, them] : [them, own]} minute={minute} where={where} />;
}

function Scoreboard({ p, save, score, minute, label, from }: { p: PausedMatch; save: FbSave; score: [number, number]; minute?: number; label?: ReactNode; from?: [number, number] }) {
  const own: BoardSide = { id: OWN, crest: crestSvg(save.crest.step, save.crest.opt, 40), n: score[0], from: from?.[0] };
  const them: BoardSide = { id: p.prep.oppId, crest: clubCrest(clubById(p.prep.oppId), 40), n: score[1], from: from?.[1] };
  const sides: [BoardSide, BoardSide] = p.prep.braboHome ? [own, them] : [them, own];
  const clock = label ?? (minute !== undefined ? <><b>{minute}′</b> of 90</> : undefined);
  return <Board sides={sides} clock={clock} label={`${clubName(sides[0].id)} ${sides[0].n}, ${clubName(sides[1].id)} ${sides[1].n}${minute !== undefined ? `, ${minute} minutes` : ''}`} />;
}

/** Whose chance it is, in words on a coloured tag (match screen round, O44): "Your attack · counter". */
const TYPE_WORD: Record<string, string> = { 'Counter-attack': 'counter', 'Set piece': 'set piece', 'Through ball': 'through ball', 'Tap-in': 'tap-in', 'Long shot': 'long shot', 'Cross into the box': 'cross', 'Corner': 'corner', 'Break through the middle': 'through the middle', 'Scramble in the box': 'scramble', 'Long-range effort': 'from range' };
function SideTag({ c }: { c: ChanceEvent }) {
  return <span className={`ms-side-tag ${c.side}`}>{c.side === 'atk' ? 'Your attack' : 'They attack'} · {TYPE_WORD[c.type] ?? c.type.toLowerCase()}</span>;
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
  const [word, setWord] = useState<boolean | null>(null);
  // The two possible rolls of this chance, the same as its replay will roll them.
  const rolls = useMemo(() => {
    if (!c || c.kept) return null;
    const first = { seed: rollSeed(p.input.seed, k, false), land: c.land, ok: firstLandingOk(c), close: c.glDist !== null };
    const second = c.retake && { seed: rollSeed(p.input.seed, k, true), land: c.retake.land, ok: c.retake.ok, close: false };
    return { first: { ...first, ms: roll(c, first.land, first.seed, first.close).ms }, second: second && { ...second, ms: roll(c, second.land, second.seed, false).ms } };
  }, [c, k, p.input.seed]);
  const shot = rolls && (phase === 'shot2' || (phase === 'result' && rolls.second) ? rolls.second! : rolls.first);
  useEffect(() => {
    if (!c || goal !== null) return;
    const next = () => { setK(k + 1); setPhase('enter'); };
    const toResult = () => { setPhase('result'); if (isGoal(c)) buzz(save.buzz, c.side === 'atk' ? [60, 40, 120] : 80); };
    const close = !!shot?.close;
    const wait = c.kept ? MS.enter : phase === 'enter' ? MS.enter : phase === 'shot' || phase === 'shot2' ? shot!.ms : phase === 'retry' ? (close ? MS.lineResult : MS.retry)
      : isGoal(c) ? (close ? MS.lineGoal : MS.goal) : close ? MS.lineResult : MS.result;
    const t = setTimeout(() => {
      if (c.kept) return next();
      if (phase === 'enter') setPhase('shot');
      else if (phase === 'shot') { if (rolls?.second) setPhase('retry'); else toResult(); }
      else if (phase === 'retry') setPhase('shot2');
      else if (phase === 'shot2') toResult();
      else if (isGoal(c)) setGoal(k);
      else next();
    }, wait);
    return () => clearTimeout(t);
  }, [c, k, phase, goal, save.buzz, rolls, shot]);
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
  const opp = clubById(p.prep.oppId);
  // What moved the odds, with the other club named in full rather than by its initials.
  const chips = oddsChips(c.mods, c.type).map((x) => ({ ...x, text: opp.short && x.text.startsWith(`${opp.short} `) ? x.text.replace(opp.short, clubName(opp.id)) : x.text }));
  const verdict = phase === 'result' ? (isGoal(c) ? (c.side === 'atk' ? 'Goal!' : 'They score.') : c.side === 'atk' ? 'It stays out.' : 'Stopped.') : null;
  const rolling = phase === 'shot' || phase === 'shot2';
  return (
    <Fit className={`md-live lt-live ms-live ${c.side}`} label="The match, live">
      <LiveBug p={p} save={save} score={score} minute={minute} />
      <div className="ms-tagrow" key={`t${k}`}><SideTag c={c} /><RollWord inShape={rolling ? word : null} /></div>
      <div className="md-stadium lt-stadium ms-stadium">
        {phase === 'enter' && !c.kept ? (
          c.side === 'atk'
            ? <CameraScene key={`m${k}`} chain={chain} inks={{ us: BRABO_INK, them: lossInkOf(p.prep.oppId) }} />
            : <MoveScene key={`m${k}`} c={c} chain={chain} inks={{ us: BRABO_INK, them: lossInkOf(p.prep.oppId) }} />
        ) : (
          <>
          <i className="lt-flood" aria-hidden="true" />
          <Pitch
            s={{ chance: c, ball: phase === 'enter' || !shot ? undefined : shot.land, flying: rolling, zoom: !!shot?.close, save: phase === 'result' && c.side === 'def' && c.ok, resultKey: k, roll: shot ? { seed: shot.seed, ok: shot.ok } : undefined }}
            dots={st.chances.slice(0, k)}
            onWord={setWord}
          />
          </>
        )}
      </div>
      <div className="lt-now ms-now" key={k}>
        <div className={`ms-chance${verdict ? ' done' : ''}`}>
          <span className="ms-say">
            <span className="lt-cap">{c.minute}′ · {verdict ? `${c.pct}% ${c.side === 'atk' ? 'to score' : 'to stop it'}` : c.retake && (phase === 'retry' || phase === 'shot2') ? `${c.retake.why}! Chance 2 of 2` : c.side === 'atk' ? 'your chance' : 'their chance'}</span>
            {verdict ? <b className={`ms-verdict ${isGoal(c) ? (c.side === 'atk' ? 'g' : 'x') : ''}`} role="status">{verdict}</b> : <span className="ms-wait">{rolling ? 'The ball is live…' : 'The move is on…'}</span>}
          </span>
          {!verdict && <span className="lt-pct"><b className="fb-num" style={pctInk(c.pct)}>{c.pct}%</b><span className="k-q">{c.side === 'atk' ? 'to score' : 'to stop it'}</span></span>}
        </div>
        {chain.length > 0 && <p className="ms-line"><b>The move</b> {chain.map((n, i) => <span key={n} className={i === chain.length - 1 ? 'last' : undefined}>{i > 0 && ' → '}{n}</span>)}</p>}
        {chips.length > 0 && <p className="ms-line"><b>Moved the odds</b> {chips.map((x, i) => <span key={x.text} style={{ color: AXIS_INK[x.axis] }}>{i > 0 && ' · '}{x.text}</span>)}</p>}
      </div>
      <div className="lt-foot"><button type="button" className="ms-skip" onClick={onEnd}>Skip to the result</button></div>
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
export function CallView({ offer, p, save, onPick }: { offer: CallOffer; p: PausedMatch; save: FbSave; chances: ChanceEvent[]; onPick: (pick: CallPick) => void }) {
  const opp = clubById(p.prep.oppId);
  const take = offer.options[0], shoot = offer.options[1], keep = offer.options[2];
  const opts: { pick: CallPick; ink: string; name: string; line: string; key: ReactNode; odds: ReactNode; style?: CSSProperties }[] = [
    { pick: 'take', ink: AXIS_INK[take.axis!], name: TAKE_LABEL[take.type!] ?? 'Take it on', line: `${take.axis} takes it on. ${fair(take.pct)}`, key: <ShapeKey ink={AXIS_INK[take.axis!]} />, odds: `${take.pct}%`, style: pctInk(take.pct) },
    { pick: 'shoot', ink: AXIS_INK.Power, name: 'Shoot on sight', line: 'From range. A screamer if it lands.', key: <ShapeKey ink={AXIS_INK.Power} dashed />, odds: `${shoot.pct}%`, style: pctInk(shoot.pct) },
    { pick: 'keep', ink: AXIS_INK.Routine, name: 'Keep the ball', line: keep.pct ? `No shot. Their next attack is ${keep.pct} points easier to stop.` : 'No shot. They have no attack left to stop.', key: <ShapeKey ink={AXIS_INK.Routine} none />, odds: 'Safe', style: { color: '#8fdcb6' } },
  ];
  return (
    <Fit className="md-callpage lt-call ms-call" label={`Call ${offer.n} of ${offer.of}`}>
      <Scoreboard p={p} save={save} score={offer.score} />
      <div className="ms-tagrow"><span className="ms-side-tag call">Your call · {offer.minute}′{offer.of > 1 ? ` · ${offer.n} of ${offer.of}` : ''}</span><span className="k-q">The shapes are your chances</span></div>
      <div className="lt-ask">
        <h2 className="md-ask">{(SITUATION[take.type!] ?? 'A chance is on.').replace('{opp}', clubName(opp.id))} What do you shout?</h2>
        <HelpButton how={CALL_HOW} />
      </div>
      <div className="ms-stadium ms-callstage">
        <CallPitch shapes={[{ pct: take.pct, ink: AXIS_INK[take.axis!], dashed: false }, { pct: shoot.pct, ink: AXIS_INK.Power, dashed: true }]} />
      </div>
      <div className="mt-opts lt-opts">
        {opts.map((o, i) => (
          <button key={o.pick} type="button" className="mt-opt lt-opt" style={{ ['--ink' as string]: o.ink, ['--i' as string]: i } as CSSProperties} onClick={() => onPick(o.pick)}>
            <span><b style={{ color: o.ink }}>{o.key}{o.name}</b><small>{o.line}</small></span>
            <b className="fb-num md-odds" style={o.style}>{o.odds}</b>
          </button>
        ))}
      </div>
      <p className="k-q lt-note ms-note">Odds from tonight’s numbers. Not watching? Your assistant takes the best odds.</p>
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
        <Scoreboard p={p} save={save} score={score} from={ours ? [score[0] - 1, score[1]] : [score[0], score[1] - 1]} />
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
  const name = clubName(opp.id);
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
