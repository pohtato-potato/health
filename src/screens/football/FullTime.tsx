// Full time: the score, xG, the moments, a hidden ability found out, then the studio and the press.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
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
import { Studio } from './Studio';
import { MomentumStrip, PickOfThree, playerOfMatch, ShotMap } from './match/MatchBits';
import { TACTIC_NAME } from '../../football/rotation/night';
import type { CallRecord } from '../../football/types';
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
    <div className="lt-ft">
      <div className="k-row"><span className="lt-cap">Full time</span><span className="k-q">{m.round ?? ''}</span></div>
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
      {m.comp === 'league' && m.events.calls && (
        <Panel className="md-ft">
          <MomentumStrip chances={m.events.chances} />
          <ShotMap chances={m.events.chances} />
          {playerOfMatch(m.credits) && <div className="fb-row"><span>Player of the match</span><b className="md-potm">{playerOfMatch(m.credits)}</b></div>}
          {m.events.calls.length > 0 && <ul className="fb-moments">{m.events.calls.map((c) => <li key={c.slot}>{callLine(c, m)}</li>)}</ul>}
          {m.plan && <p className="k-q">Plan: {TACTIC_NAME[m.plan.tactic ?? m.tactic?.pick ?? 'hold']}{m.plan.half2 ? `, ${TACTIC_NAME[m.plan.half2]} after half-time` : ''} · tempo {m.plan.tempo ?? 'normal'}{m.plan.card ? ` · tactic card +1 ${m.plan.card}` : ''}{m.plan.read && m.plan.read !== 'Not scouted yet' ? `. ${m.plan.read}` : ''}</p>}
        </Panel>
      )}
      {m.pick && <PickOfThree matchId={m.id} pick={m.pick} name={(id) => clubById(id).name} />}
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
      {m.events.revealed && (
        <Panel ink="#c2b2ff">
          <b className="k-lb">Found out</b>
          <span className="k-q"><b style={{ color: '#ede6da' }}>{m.events.revealed}</b>: their hidden ability, now on their club page.</span>
        </Panel>
      )}
      {tape && <OnTape m={m} />}
      {studio && <Studio lines={studio.text.split('\n')} />}
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
