// A rival is born.
import { clubCrest } from '../../../football/art/crest';
import { clubById } from '../../../football/data/load';
import { HOW_TEXT, rivalTwist, type Rival } from '../../../football/rivals';
import { Aurora } from '../FootballHome';
import { Art } from '../Tonight';

export function RivalBornView({ r, onDone }: { r: Rival; onDone: () => void }) {
  const c = clubById(r.clubId);
  const tw = rivalTwist(r.clubId, r.how, r.best);
  return (
    <div className="fb-moment" role="dialog" aria-modal="true" aria-labelledby="fb-rival-t">
      <Aurora a="#ff6464" c="#6c3fc4">
        <main className="fb-page">
          <span className="fb-lb">A rival is born</span>
          <div className="fb-ctr"><Art svg={clubCrest(c, 120)} /></div>
          <h2 id="fb-rival-t" className="fb-momtitle">{c.name}</h2>
          <p className="fb-s">{HOW_TEXT[r.how]} Every match against them is a derby now.</p>
          <section className="fb-card pu"><span className="fb-lb">The rivalry’s modifier</span><b>{tw.name}</b><span className="fb-s">{tw.text}</span></section>
          <div className="fb-btns"><button type="button" className="fb-btn pri" onClick={onDone}>Noted</button></div>
        </main>
      </Aurora>
    </div>
  );
}
