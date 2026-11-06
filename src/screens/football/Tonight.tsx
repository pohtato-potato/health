import { clubCrest, crestSvg } from '../../football/art/crest';
import { clubById } from '../../football/data/load';
import { OWN } from '../../football/store/season';
import type { Tonight as TonightData } from '../../football/store/hooks';
import type { StoredMatch } from '../../football/store/tables';
import { go } from '../../router';
import { Radar } from './Radar';

/** Our own SVG strings (crests, kits): built from data we ship, escaped where text goes in. */
export function Art({ svg, className }: { svg: string; className?: string }) {
  return <span className={`fb-art ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}

const nameOf = (id: string) => (id ? clubById(id).name : '');
export const scoreLine = (m: StoredMatch) => `${nameOf(m.home)} ${m.score[0]}–${m.score[1]} ${nameOf(m.away)}${m.pens ? ` (${m.pens[0]}–${m.pens[1]} on penalties)` : ''}`;
const RESULT = { W: 'Won', D: 'Drew', L: 'Lost' } as const;

export function TonightView({ t, onWatch }: { t: TonightData; onWatch?: (id: string) => void }) {
  const own = { step: t.save.crest.step, opt: t.save.crest.opt };
  const watch = onWatch ?? ((id: string) => go('/football/match', { id }));
  const f = t.fixture;
  if (t.played.length) {
    return (
      <>
        <div className="fb-row"><span className="fb-lb">Full time</span><span className="fb-s">{t.played[0].round ?? ''}</span></div>
        {t.played.map((m) => (
          <article key={m.id} className={`fb-card hot fb-result r-${m.result}`}>
            <div className="fb-duel">
              <Art svg={m.home === OWN ? crestSvg(own.step, own.opt, 52) : clubCrest(clubById(m.home), 52)} />
              <b className="fb-score" aria-label={scoreLine(m)}>{m.score[0]}–{m.score[1]}</b>
              <Art svg={m.away === OWN ? crestSvg(own.step, own.opt, 52) : clubCrest(clubById(m.away), 52)} />
            </div>
            <p className="fb-s fb-ctr">{scoreLine(m)}</p>
            <span className={`fb-tag ${m.result === 'W' ? 'or' : 'pu'} fb-ctrself`}>{RESULT[m.result]}</span>
            <div className="fb-btns">
              <button type="button" className="fb-btn pri" onClick={() => watch(m.id)}>{m.watched ? 'Watch again' : 'Watch the match'}</button>
            </div>
          </article>
        ))}
      </>
    );
  }
  return (
    <>
      <div className="fb-row">
        <span className="fb-lb">{f?.label ?? 'Between seasons'}</span>
        <span className="fb-s">Half-time 6 pm</span>
      </div>
      {f && (
        <>
          <div className="fb-duel">
            <figure className="fb-side">
              <Art svg={crestSvg(own.step, own.opt, 56)} />
              <figcaption>Brabo United</figcaption>
            </figure>
            <b className="fb-v" aria-hidden="true">v</b>
            <figure className="fb-side">
              {t.opp ? <Art svg={clubCrest(t.opp, 56)} /> : <span className="fb-unknown" aria-hidden="true">?</span>}
              <figcaption>{t.opp ? t.opp.name : 'Drawn on the night'}</figcaption>
            </figure>
          </div>
          <h2 className="fb-hl">{t.opp ? `Tonight: ${t.opp.name}` : f.round ?? 'Tonight'}</h2>
          <p className="fb-s fb-ctr">{[f.round, f.opp ? (f.braboHome ? 'Home' : 'Away') : undefined].filter(Boolean).join(' · ')}</p>
        </>
      )}
      <Radar values={t.liveValues} flags={t.flags} captain={t.save.slots.includes('armband') ? t.save.captain : undefined} />
      <p className="fb-s fb-ctr">Your shape so far. It’s fixed when you close the day.</p>
      {(t.known.length > 0 || t.hiddenNote) && (
        <section className="fb-card pu" aria-label="Their abilities">
          <span className="fb-lb">Their abilities</span>
          {t.known.map((a) => (
            <div key={a.name} className="fb-col"><b>{a.name}</b><span className="fb-s">{a.text}</span></div>
          ))}
          {t.hiddenNote && <p className="fb-s">One ability, found out after you first play them.</p>}
        </section>
      )}
      {(t.knocks.length > 0 || t.stack > 0) && (
        <section className="fb-card" aria-label="Your side tonight">
          {t.knocks.map((k) => <p key={k.why} className="fb-s"><b>{k.why}</b>{k.d ? ` · ${k.axis} ${k.d > 0 ? '+' : ''}${k.d}` : ''}</p>)}
          {t.stack > 0 && <p className="fb-s"><b>Weekly stack</b> · {t.stack} {t.stack === 1 ? 'ability' : 'abilities'} earned this week lift your attack</p>}
        </section>
      )}
    </>
  );
}
