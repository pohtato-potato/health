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

export function FullTimeView({ m, save, studio, press, tier = 6, onWatch }: { m: StoredMatch; save: FbSave; studio?: FbNews; press?: FbNews; tier?: Tier; onWatch?: () => void }) {
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
      {studio && <Studio lines={studio.text.split('\n')} />}
      {press?.lineId && <Press matchId={m.id} lineId={press.lineId} facts={facts} answered={press.answered} onAnswer={(i) => answerPress(m.id, i)} />}
    </div>
  );
}

/** Full time with its stored studio and press lines. */
export function FullTime({ m, save, onWatch }: { m: StoredMatch; save: FbSave; onWatch?: () => void }) {
  const got = useLiveQuery(async () => ({
    news: await db.fbNews.bulkGet([`${m.id}:studio`, `${m.id}:press`]),
    tier: (await db.fbSeasons.get(m.season))?.tierOf.bra,
  }), [m.id]);
  return <FullTimeView m={m} save={save} studio={got?.news[0]} press={got?.news[1]} tier={got?.tier} onWatch={onWatch} />;
}

/** The night out was logged light/medium/heavy, so Fuel rolled within its range on each chance (l-away). */
export const rangedFuel = (m: Pick<StoredMatch, 'events'>) => m.events.chances.some((c) => c.mods.some((x) => x.kind === 'range'));
