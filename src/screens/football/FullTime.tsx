// Full time: the score, xG, the moments, a hidden ability found out, then the studio and the press.
import { useLiveQuery } from 'dexie-react-hooks';
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

export function FullTimeView({ m, save, studio, press, tier = 6, onWatch }: { m: StoredMatch; save: FbSave; studio?: FbNews; press?: FbNews; tier?: Tier; onWatch?: () => void }) {
  const s = homeFirst(m);
  const xg = m.home === OWN ? m.events.xg : [m.events.xg[1], m.events.xg[0]];
  const crest = (id: string) => (id === OWN ? crestSvg(save.crest.step, save.crest.opt, 52) : clubCrest(clubById(id), 52));
  const facts = factsFor(m, tier, 1, 'press');
  return (
    <>
      <div className="fb-row"><span className="fb-lb">Full time</span><span className="fb-s">{m.round ?? ''}</span></div>
      <article className={`fb-card hot fb-result r-${m.result}`}>
        <div className="fb-duel">
          <Art svg={crest(m.home)} />
          <b className="fb-score" aria-label={scoreLine(m)}>{s[0]}–{s[1]}</b>
          <Art svg={crest(m.away)} />
        </div>
        <p className="fb-s fb-ctr">{scoreLine(m)}</p>
        <span className={`fb-tag ${m.result === 'W' ? 'or' : 'pu'} fb-ctrself`}>{RESULT[m.result]}</span>
        <p className="fb-s fb-ctr">xG {xg[0].toFixed(1)} – {xg[1].toFixed(1)}</p>
        {onWatch && <div className="fb-btns"><button type="button" className="fb-btn pri" onClick={onWatch}>{m.watched ? 'Watch again' : 'Watch the match'}</button></div>}
      </article>
      {m.events.moments.length > 0 && (
        <section className="fb-card" aria-label="Moments">
          <span className="fb-lb">Moments</span>
          <ul className="fb-moments">{m.events.moments.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </section>
      )}
      {m.events.revealed && (
        <section className="fb-card pu" aria-label="Found out">
          <span className="fb-lb">Found out</span>
          <p className="fb-s"><b>{m.events.revealed}</b>: their hidden ability, now on their club page.</p>
        </section>
      )}
      {studio && <Studio lines={studio.text.split('\n')} />}
      {press?.lineId && <Press matchId={m.id} lineId={press.lineId} facts={facts} answered={press.answered} onAnswer={(i) => answerPress(m.id, i)} />}
    </>
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
