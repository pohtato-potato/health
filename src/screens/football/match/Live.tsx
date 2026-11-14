// Matchday depth (spec 2026-11-12 §3): watching the waiting league match. Before kick-off (lg-pre), live on the
// radar-as-stadium (r3-live), a call (r3-call), a goal (lg-goal), half-time (lg-half), then full time. Every number
// here comes from the same rebuilt input the store finishes with, so what you watch is what is stored.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { db } from '../../../db/db';
import { clubCrest } from '../../../football/art/crest';
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
import { ElevenDots, MomentumStrip, moveChain, oddsChips, pctInk, PlanPanel, ScoreBar, ShotMap } from './MatchBits';
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
    <Aurora className="mt-page">
      <main className="fb-page">
        <div className="fb-row"><span className="fb-lb">Last night · {TIER_NAMES[String(p.prep.braboTier)] ?? `Division ${p.prep.braboTier}`}{p.prep.matchday ? ` · matchday ${p.prep.matchday}` : ''}</span><span className="fb-s">{p.prep.braboHome ? 'Home' : 'Away'}</span></div>
        <div className="md-opp">
          <Art svg={clubCrest(opp, 48)} />
          <span><b className="md-oname">{opp.name}</b><span className="fb-s">Rated {Math.round(rating)}{gap ? ` · ${Math.abs(gap)} division${Math.abs(gap) === 1 ? '' : 's'} ${gap > 0 ? 'above' : 'below'} you` : ' · your division'}</span></span>
        </div>
        <div className="md-chips">
          {opp.known.slice(0, 2).map((a) => <span key={a.name} className="md-chip" style={{ color: '#ff9a76', borderColor: '#ff9a76' }}>{a.name}</span>)}
          {style?.say && <span className="md-chip" style={{ color: '#93c3dc', borderColor: '#93c3dc' }}>{style.say}</span>}
          {read.weakKnown && <span className="md-chip" style={{ color: '#8fdcb6', borderColor: '#8fdcb6' }}>{WEAK_CHIP[weakSide(p.prep.oppId)]}</span>}
        </div>
        <PlanPanel date={p.date} tactic={tactic} plan={plan} read={read} xi={[]} cards={save.tacticCards ?? []} />
        <span className="fb-lb">Your eleven</span>
        <ElevenDots xi={p.prep.xi} />
        <div className="fb-btns md-foot">
          <button type="button" className="fb-btn pri wide" onClick={onKickOff}>Kick off</button>
          <button type="button" className="fb-btn wide" onClick={onSkip}>Skip to the result</button>
        </div>
      </main>
    </Aurora>
  );
}

type Phase = 'enter' | 'shot' | 'result';
const MS: Record<Phase, number> = { enter: 1800, shot: 1300, result: 1400 };

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
  const skip = <button type="button" className="fb-btn wide" onClick={onEnd}>Skip to the result</button>;

  if (goal !== null) return <GoalView c={st.chances[goal]} p={p} save={save} score={score} credit={credits.find((x) => x.i === goal)} onOn={() => { setGoal(null); setK(goal + 1); setPhase('enter'); }} />;
  if (!c) {
    if (st.stop?.kind === 'call') return <CallView offer={st.stop.offer} p={p} save={save} chances={st.chances} onPick={(pick) => once(() => recordLive({ pick }))} />;
    if (st.stop?.kind === 'half') return <HalfView p={p} save={save} chances={st.chances} score={score} onGo={(half2) => once(() => recordLive({ halfSeen: true, half2 }))} />;
    return (
      <Aurora className="mt-page">
        <main className="fb-page">
          <ScoreBar save={save} oppId={p.prep.oppId} braboHome={p.prep.braboHome} score={score} big />
          <p className="md-whistle">Full time</p>
          <MomentumStrip chances={st.chances} />
          <button type="button" className="fb-btn pri wide" onClick={onEnd}>See full time</button>
        </main>
      </Aurora>
    );
  }
  const chain = moveChain(c, k, p.prep.xi, credits.find((x) => x.i === k)?.name);
  const chips = oddsChips(c.mods, c.type);
  return (
    <Aurora className={`mt-page md-live ${c.side}`}>
      <main className="fb-page">
        <ScoreBar save={save} oppId={p.prep.oppId} braboHome={p.prep.braboHome} score={score} big />
        <div className="md-stadium">
          <Pitch s={{ chance: c, ball: phase === 'enter' ? undefined : c.land, flying: phase === 'shot', zoom: false, save: phase === 'result' && c.side === 'def' && c.ok, resultKey: k }} dots={st.chances.slice(0, k)} entry={phase !== 'enter'} />
        </div>
        {chain.length > 0 && (
          <ol className="md-chain" aria-label="The move">
            {chain.map((n, i) => <li key={n} className={i === chain.length - 1 ? 'last' : undefined}>{n}</li>)}
          </ol>
        )}
        <div className="md-now">
          <span className="fb-lb">{c.minute}′ · {c.type}</span>
          <p><b className="fb-num md-pct" style={pctInk(c.pct)}>{c.pct}%</b> <span className="fb-s">{c.side === 'atk' ? 'to score' : 'to stop it'}</span></p>
          {phase === 'result' && <p className="md-res">{isGoal(c) ? (c.side === 'atk' ? 'Goal!' : 'They score.') : c.side === 'atk' ? 'It stays out.' : 'Stopped.'}</p>}
        </div>
        {chips.length > 0 && <div className="md-chips">{chips.map((x) => <span key={x.text} className="md-chip" style={{ color: AXIS_INK[x.axis], borderColor: AXIS_INK[x.axis] }}>{x.text}</span>)}</div>}
        <MomentumStrip chances={upTo} upTo={minute} />
        <div className="fb-row"><span className="fb-s">Kick-off</span><span className="fb-s">{minute}′ of 90</span></div>
        {skip}
      </main>
    </Aurora>
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

/** A call (r3-call): three options, the odds in value-scale colour, each in its axis ink. */
export function CallView({ offer, p, save, chances, onPick }: { offer: CallOffer; p: PausedMatch; save: FbSave; chances: ChanceEvent[]; onPick: (pick: CallPick) => void }) {
  const opp = clubById(p.prep.oppId);
  const take = offer.options[0], shoot = offer.options[1], keep = offer.options[2];
  const score = offer.score;
  return (
    <Aurora className="mt-page md-callpage">
      <main className="fb-page">
        <ScoreBar save={save} oppId={p.prep.oppId} braboHome={p.prep.braboHome} score={score} />
        <div className="fb-row"><span className="fb-s">{offer.minute} minutes</span><span className="fb-s">Call {offer.n} of {offer.of}</span></div>
        <MomentumStrip chances={chances} upTo={offer.minute} />
        <h2 className="md-ask">{(SITUATION[take.type!] ?? 'A chance is on.').replace('{opp}', opp.short || opp.name)} What do you shout?</h2>
        <div className="mt-opts">
          <button type="button" className="mt-opt" style={{ borderColor: AXIS_INK[take.axis!] }} onClick={() => onPick('take')}>
            <span><b style={{ color: AXIS_INK[take.axis!] }}>{TAKE_LABEL[take.type!] ?? 'Take it on'}</b><small>{take.axis} takes it on. {fair(take.pct)}</small></span>
            <b className="fb-num md-odds" style={pctInk(take.pct)}>{take.pct}%</b>
          </button>
          <button type="button" className="mt-opt" style={{ borderColor: AXIS_INK.Power }} onClick={() => onPick('shoot')}>
            <span><b style={{ color: AXIS_INK.Power }}>Shoot on sight</b><small>From range. Unlikely, but a screamer if it lands.</small></span>
            <b className="fb-num md-odds" style={pctInk(shoot.pct)}>{shoot.pct}%</b>
          </button>
          <button type="button" className="mt-opt" style={{ borderColor: AXIS_INK.Routine }} onClick={() => onPick('keep')}>
            <span><b style={{ color: AXIS_INK.Routine }}>Keep the ball</b><small>{keep.pct ? 'No chance now. Their next attack is 15 points easier to stop.' : 'No chance now. They have no attack left to stop.'}</small></span>
            <b className="fb-num md-odds" style={{ color: '#3fd98a' }}>Safe</b>
          </button>
        </div>
        <p className="fb-s">The odds come from tonight’s numbers. If you are not watching, your assistant takes the best odds.</p>
      </main>
    </Aurora>
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
    <Aurora className="mt-page md-goal" a={colours[0]} c={colours[1]}>
      <main className="fb-page" role="alert">
        <span className="fb-lb">{c.minute} minutes</span>
        <b className="md-gword">{ours ? 'GOAL' : 'They score'}</b>
        <span className="md-tag">{screamer ? `SCREAMER · ${c.pct}% and in` : ours ? `${c.type} · ${c.pct}% and in` : `${c.type} · ${c.pct}% to stop it`}</span>
        {ours && credit && (
          <div className="md-scorer">
            {player && <div className="mt-card"><PlayerCard card={player.card} art={player.art} seed={player.id} player={player} /></div>}
            <span><b className="md-oname">{credit.name}</b><span className="fb-s">{credit.unit}</span></span>
          </div>
        )}
        {!ours && <Art svg={clubCrest(opp, 72)} className="md-gcrest" />}
        <div className="md-stadium sm"><Pitch s={{ chance: c, ball: c.land, flying: false, zoom: false, save: false, resultKey: 0 }} /></div>
        <ScoreBar save={save} oppId={p.prep.oppId} braboHome={p.prep.braboHome} score={score} big />
        <button type="button" className="fb-btn pri wide" onClick={onOn}>Carry on</button>
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
    <Aurora className="mt-page">
      <main className="fb-page">
        <div className="fb-row"><span className="fb-lb">Half-time</span><span className="fb-s">In the studio</span></div>
        <ScoreBar save={save} oppId={p.prep.oppId} braboHome={p.prep.braboHome} score={score} big />
        <p className="md-studio g"><b>The Gremlin</b>{lines[0]}</p>
        <p className="md-studio p"><b>The pundit</b>{lines[1]}</p>
        <ShotMap chances={chances} label="Shot map so far" />
        <div className="fb-row"><span>Chances</span><b className="fb-num">{n[0]} v {n[1]}</b></div>
        <div className="fb-row"><span>Expected goals</span><b className="fb-num">{xg[0].toFixed(1)} v {xg[1].toFixed(1)}</b></div>
        <span className="fb-lb">Change the plan?</span>
        <div className="md-seg3">
          {TACTICS.map((t) => <button key={t} type="button" className={pick === t ? 'on' : undefined} aria-pressed={pick === t} onClick={() => setPick(t)}>{TACTIC_NAME[t]}</button>)}
        </div>
        <div className="fb-btns md-foot"><button type="button" className="fb-btn pri wide" onClick={() => onGo(pick === (plan.tactic ?? p.prep.tactic.pick) ? null : pick)}>Second half</button></div>
      </main>
    </Aurora>
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
