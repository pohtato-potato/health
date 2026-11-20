// Full time: the score, xG, the moments, a hidden ability found out, then the studio and the press.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { db } from '../../db/db';
import { clubCrest, crestSvg } from '../../football/art/crest';
import { clubById } from '../../football/data/load';
import { factsFor } from '../../football/store/lines';
import { answerPress } from '../../football/store/save';
import type { Tier } from '../../football/types';
import { OWN } from '../../football/store/season';
import type { FbNews, FbSave, StoredMatch } from '../../football/store/tables';
import { Art, homeFirst, RESULT, scoreLine } from './Tonight';
import { Press } from './Press';
import { answerPapers, loadPapers, type Papers } from '../../football/store/papers';
import { tapeOf, VIDEO_ROOM } from '../../football/tape';
import { hashSeed } from '../../football/rng';
import { Studio } from './Studio';
import { clubInk, MomentumStrip, PickOfThree, playerOfMatch, ShotMap } from './match/MatchBits';
import '../../styles/match-screen.css';
import { TACTIC_NAME } from '../../football/rotation/night';
import type { Axis, CallRecord, ChanceEvent, ModKind } from '../../football/types';
import { AXIS_INK } from '../../ui/inks';
import { Action, Panel } from '../../ui/kit/Kit';
import '../../styles/look-tonight.css';

const CALL_WORD = { take: 'took it on', shoot: 'shot on sight', keep: 'kept the ball' } as const;
/** "71′ · you took it on (48%): in." */
function callLine(c: CallRecord, m: StoredMatch): string {
  const ev = m.events.chances[c.slot];
  const odds = c.pick === 'take' ? `${c.odds.take}%` : c.pick === 'shoot' ? `${c.odds.shoot}%` : 'safe';
  const out = c.pick === 'keep' ? '' : ev?.ok ? ': in.' : ': stayed out.';
  return `${c.minute}′ · ${c.by === 'you' ? 'you' : 'your assistant'} ${CALL_WORD[c.pick]} (${odds})${out}`;
}


/** One ability that played tonight (f23-ft): what it did and on how many chances. */
export interface Played { name: string; line: string; tally: string; ink: string }
const PLAYED_KINDS: ModKind[] = ['ability', 'captain', 'stack', 'card', 'sub'];
const NAME: Partial<Record<ModKind, string>> = { captain: 'Captain’s armband', stack: 'The weekly stack', sub: 'Off the bench' };
const signed = (d: number) => `${d > 0 ? '+' : ''}${Number.isInteger(d) ? d : d.toFixed(2).replace(/0$/, '')}`;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** Your abilities that touched a chance tonight, most-used first; a retake is its own row with what came of it. */
export function whatPlayed(chances: ChanceEvent[]): Played[] {
  const by = new Map<string, { axes: Map<Axis, number>; n: number }>();
  for (const c of chances) {
    const seen = new Set<string>();
    for (const x of c.mods) {
      if (!PLAYED_KINDS.includes(x.kind) || x.d <= 0) continue;
      const name = x.kind === 'ability' || x.kind === 'card' ? x.why : NAME[x.kind] ?? x.why;
      const row = by.get(name) ?? { axes: new Map(), n: 0 };
      row.axes.set(x.axis, Math.max(row.axes.get(x.axis) ?? 0, x.d));
      if (!seen.has(name)) { row.n += 1; seen.add(name); }
      by.set(name, row);
    }
  }
  const rows: Played[] = [...by].sort((a, b) => b[1].n - a[1].n).map(([name, r]) => {
    const axes = [...r.axes];
    const same = axes.every(([, d]) => d === axes[0][1]);
    const line = axes.length === 1 ? `${signed(axes[0][1])} ${axes[0][0]}` : same && axes.length > 2 ? `${signed(axes[0][1])} to ${axes.length} axes` : axes.map(([a, d]) => `${signed(d)} ${a}`).join(', ');
    return { name, line, tally: plural(r.n, 'chance'), ink: AXIS_INK[axes[0][0]] };
  });
  for (const c of chances) {
    if (!c.retake) continue;
    rows.unshift({ name: c.retake.why, line: `The ${c.minute}′ miss, taken again`, tally: c.retake.ok ? (c.side === 'atk' ? '1 goal' : 'Saved') : c.side === 'atk' ? 'Missed again' : 'In', ink: '#5fe3a1' });
  }
  return rows;
}

/** What played tonight: one quiet line per ability, a coloured dot beside its name. */
export function WhatPlayed({ rows }: { rows: Played[] }) {
  if (!rows.length) return null;
  return (
    <section className="ft-played" aria-label="What played tonight">
      <div className="ft-hd"><b>What played tonight</b><span>{rows.length} {rows.length === 1 ? 'ability' : 'abilities'}</span></div>
      <ul>{rows.map((r, k) => <li key={r.name} style={{ ['--c' as string]: r.ink, animationDelay: `${(k * 0.12).toFixed(2)}s` } as CSSProperties}><i aria-hidden="true" /><span><b>{r.name}</b><small>{r.line}</small></span><em>{r.tally}</em></li>)}</ul>
    </section>
  );
}

/** Their hidden ability, found out tonight: a cream card sealed with their crest, saying whether it woke. */
export function HiddenSeal({ club, crest, name, text, woke }: { club: string; crest: string; name: string; text?: string; woke: number }) {
  return (
    <section className="ft-seal" aria-label={`${club}’s hidden ability`}>
      <Art svg={crest} className="ft-wax" />
      <span>
        <small>{club}’s hidden ability</small>
        <b>{name}</b>
        {text && <p>{text}</p>}
        <span className={`ft-woke ${woke ? 'on' : ''}`}>{woke ? `Woke on ${plural(woke, 'chance')}` : 'Never woke tonight'}</span>
      </span>
    </section>
  );
}

export function FullTimeView({ m, save, studio, press, tier = 6, onWatch, papers, tape }: { m: StoredMatch; save: FbSave; studio?: FbNews; press?: FbNews; tier?: Tier; onWatch?: () => void; papers?: Papers | null; tape?: boolean }) {
  const s = homeFirst(m);
  const xg = m.home === OWN ? m.events.xg : [m.events.xg[1], m.events.xg[0]];
  const crest = (id: string) => (id === OWN ? crestSvg(save.crest.step, save.crest.opt, 52) : clubCrest(clubById(id), 52));
  const facts = factsFor(m, tier, 1, 'press');
  // The whole page is the result (owner, 9 Nov): the Football aurora takes the result's colours while Full time shows.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.ft = m.result;
    return () => { if (root.dataset.ft === m.result) delete root.dataset.ft; };
  }, [m.result]);
  return (
    <div className="lt-ft ms-ft">
      <Streamers m={m} />
      <div className="k-row"><span className="lt-cap">Full time · {scoreLine(m)}</span><span className="k-q">{m.round ?? ''}</span></div>
      {studio && <Studio lines={studio.text.split('\n')} />}
      <article className={`fb-card hot fb-result r-${m.result}`}>
        <div className="fb-duel">
          <Art svg={crest(m.home)} />
          <b className="fb-score" aria-label={scoreLine(m)}>{s[0]}–{s[1]}</b>
          <Art svg={crest(m.away)} />
        </div>
        <p className="fb-s fb-ctr">{scoreLine(m)}</p>
        <span className={`fb-tag ${m.result === 'W' ? 'or' : 'pu'} fb-ctrself`}>{RESULT[m.result]}</span>
        <p className="fb-s fb-ctr">xG {xg[0].toFixed(1)} – {xg[1].toFixed(1)}</p>
        {rangedFuel(m) && <p className="fb-s fb-ctr">Fuel played on wider dice tonight: the night out was logged as a range, so each chance rolled it a little either side of the middle.</p>}
        {onWatch && <Action quiet sm onClick={onWatch}>{m.watched ? 'Watch again' : 'Watch the match'}</Action>}
      </article>
      <WhatPlayed rows={whatPlayed(m.events.chances)} />
      {m.comp === 'league' && m.events.calls && (
        <Panel className="md-ft">
          <MomentumStrip chances={m.events.chances} />
          <ShotMap chances={m.events.chances} />
          {playerOfMatch(m.credits) && <div className="fb-row"><span>Player of the match</span><b className="md-potm">{playerOfMatch(m.credits)}</b></div>}
          {m.events.calls.length > 0 && <ul className="fb-moments">{m.events.calls.map((c) => <li key={c.slot}>{callLine(c, m)}</li>)}</ul>}
          {m.plan && <p className="k-q">Plan: {TACTIC_NAME[m.plan.tactic ?? m.tactic?.pick ?? 'hold']}{m.plan.half2 ? `, ${TACTIC_NAME[m.plan.half2]} after half-time` : ''} · tempo {m.plan.tempo ?? 'normal'}{m.plan.card ? ` · tactic card +1 ${m.plan.card}` : ''}{m.plan.read && m.plan.read !== 'Not scouted yet' ? `. ${m.plan.read}` : ''}</p>}
        </Panel>
      )}
      {(m.credits?.length ?? 0) > 0 && (
        <Panel ink="#f2c46d">
          <b className="k-lb">Goals and saves</b>
          <ul className="lt-list">{m.credits!.map((c) => <li key={c.i}><b>{c.kind === 'goal' ? 'Goal' : 'Save'} · {m.events.chances[c.i]?.minute ?? ''}′</b> <span className="k-q">{c.line}</span></li>)}</ul>
        </Panel>
      )}
      {m.events.moments.length > 0 && (
        <Panel ink="#ff9a76">
          <b className="k-lb">Moments</b>
          <ul className="lt-list">{m.events.moments.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </Panel>
      )}
      {m.events.revealed && (() => {
        const opp = clubById(m.home === OWN ? m.away : m.home);
        return <HiddenSeal club={opp.name} crest={clubCrest(opp, 40)} name={m.events.revealed} text={opp.hidden?.name === m.events.revealed ? opp.hidden.text : undefined}
          woke={m.events.chances.filter((c) => c.mods.some((x) => x.kind === 'hidden')).length} />;
      })()}
      {m.pick && <PickOfThree matchId={m.id} pick={m.pick} name={(id) => clubById(id).name} />}
      {tape && <OnTape m={m} />}
      {press?.lineId && <Press matchId={m.id} lineId={press.lineId} facts={facts} answered={press.answered} onAnswer={(i) => answerPress(m.id, i)} />}
      {papers && <PapersLine matchId={m.id} p={papers} />}
    </div>
  );
}

/** Full time with its stored studio and press lines. */
export function FullTime({ m, save, onWatch }: { m: StoredMatch; save: FbSave; onWatch?: () => void }) {
  const got = useLiveQuery(async () => ({
    news: await db.fbNews.bulkGet([`${m.id}:studio`, `${m.id}:press`]),
    tier: (await db.fbSeasons.get(m.season))?.tierOf.bra,
    papers: await loadPapers(m),
    tape: Boolean((await db.fbBundles.get(VIDEO_ROOM))?.done),
  }), [m.id]);
  return <FullTimeView m={m} save={save} studio={got?.news[0]} press={got?.news[1]} tier={got?.tier} onWatch={onWatch} papers={got?.papers} tape={got?.tape} />;
}

/** The night out was logged light/medium/heavy, so Fuel rolled within its range on each chance (l-away). */
export const rangedFuel = (m: Pick<StoredMatch, 'events'>) => m.events.chances.some((c) => c.mods.some((x) => x.kind === 'range'));

/** The press office (ledger O40): after a big night, pick the line the papers run. Story prints it. */
function PapersLine({ matchId, p }: { matchId: string; p: Papers }) {
  const said = p.answered;
  return (
    <Panel ink="#f4aedb">
      <b className="k-lb">The line for the papers</b>
      {said === undefined ? (
        <>
          <span className="k-q">The press officer asks which line the papers run tomorrow. Pick one; Story prints it.</span>
          <div className="k-col" style={{ gap: 8 }}>
            {p.lines.map((l, i) => <button key={i} type="button" className="fb-btn fb-answer" onClick={() => void answerPapers(matchId, i as 0 | 1 | 2)}>{l}</button>)}
          </div>
        </>
      ) : (
        <span>The papers run your line: <b>“{p.lines[said]}”</b></span>
      )}
    </Panel>
  );
}

/** The video room (ledger O40): every goal against on tape, and on a loss the unit it turned on. Words only. */
function OnTape({ m }: { m: StoredMatch }) {
  const t = tapeOf(m);
  if (!t.goals.length) return null;
  return (
    <Panel ink="#93c3dc">
      <b className="k-lb">On tape</b>
      {t.turnedOn && <span>The video room: this one turned on <b>{t.turnedOn}</b>.</span>}
      <ul className="lt-list">{t.goals.map((g, i) => <li key={i}><b>{g.minute}′</b> {g.type}{g.unit ? ` · ${g.unit}` : ''}</li>)}</ul>
    </Panel>
  );
}

/**
 * Streamers over full time (match screen round, O44): Brabo's colours fall on a win, the other club's on a loss, and a
 * few drift slowly down on a draw. They fall behind the cards, so they never cover text being read, and they are gone
 * after a few seconds.
 */
function Streamers({ m }: { m: StoredMatch }) {
  const [on, setOn] = useState(true);
  useEffect(() => { const t = setTimeout(() => setOn(false), 6000); return () => clearTimeout(t); }, [m.id]);
  const them = m.home === OWN ? m.away : m.home;
  const opp = clubById(them);
  const inks = m.result === 'W' ? ['#ff8a3d', '#c2b2ff', '#fff6d6'] : m.result === 'L' ? [clubInk(them), opp.colours[1] ?? '#ffffff', '#ede6da'] : ['#ff8a3d', clubInk(them), '#ede6da'];
  const bits = useMemo(() => {
    const n = m.result === 'D' ? 14 : 44;
    return Array.from({ length: n }, (_, k) => {
      const h = hashSeed(m.id, 'streamer', String(k));
      return { x: (h % 1000) / 10, ink: inks[k % inks.length], delay: ((h >> 10) % 1400) / 1000, dur: (m.result === 'D' ? 4.2 : 2.6) + ((h >> 20) % 900) / 1000, spin: (h >> 4) % 2 ? 1 : -1, w: 7 + ((h >> 8) % 5) };
    });
  }, [m.id, m.result]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!on) return null;
  return (
    <div className={`ms-streamers ${m.result === 'D' ? 'drift' : ''}`} aria-hidden="true">
      {bits.map((b, k) => <i key={k} style={{ left: `${b.x}%`, background: b.ink, width: b.w, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s`, ['--spin' as string]: b.spin } as CSSProperties} />)}
    </div>
  );
}
