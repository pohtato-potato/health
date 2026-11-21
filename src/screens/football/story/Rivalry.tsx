// One rivalry (board 20, s20-rival): both crests fly in with a bolt between, the record as a scoreboard, the rivalry's
// modifier, then every meeting and the moments between you.
import { clubCrest, crestSvg } from '../../../football/art/crest';
import { clubById } from '../../../football/data/load';
import { howText, twistOf, type Rival } from '../../../football/rivals';
import { headToHead } from '../../../football/store/league';
import type { StoredMatch } from '../../../football/store/tables';
import { Panel, Sect } from '../../../ui/kit/Kit';
import { ResultMark } from '../league/Table';
import { Art, scoreLine } from '../Tonight';

type Own = { step: 1 | 2 | 3 | 4 | 5; opt: 'a' | 'b' | 'c' | 'd' | 'e' };
const dayShort = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export function RivalryView({ r, matches, own = { step: 1, opt: 'a' } }: { r: Rival; matches: StoredMatch[]; own?: Own }) {
  const c = clubById(r.clubId);
  const h = headToHead(matches, r.clubId);
  const tw = twistOf(r);
  const moments = h.meetings.flatMap((m) => m.events.moments.map((x) => ({ date: m.date, text: x })));
  return (
    <div className="lt-story">
      <section className="rv20" aria-label={`The rival: ${c.name}`}>
        <div className="fo20" role="img" aria-label={`Your crest and ${c.name}’s, face to face`}>
          <span className="a"><Art svg={crestSvg(own.step, own.opt, 96)} /></span>
          <svg className="bolt" viewBox="0 0 44 90" aria-hidden="true"><path d="M26 0 L6 50 H20 L14 90 L40 34 H24 Z" fill="#fff" stroke="#ffd36b" strokeWidth="2" /></svg>
          <span className="b"><Art svg={clubCrest(c, 96)} /></span>
        </div>
        <p className="vs20"><b>{c.name}</b><span>{r.how === 'legend' ? 'Your legend rival' : 'Your rival'}{r.since ? ` since ${dayShort(r.since)}` : ''}</span></p>
        <p className="rv20-how">{howText(r)}</p>
      </section>
      <div className="sb20" aria-label="The record between you">
        <span className="sb20-t"><b className="k-num">{h.w}</b><span className="k-q">won</span></span>
        <span className="sb20-t"><b className="k-num">{h.d}</b><span className="k-q">drawn</span></span>
        <span className="sb20-t"><b className="k-num">{h.l}</b><span className="k-q">lost</span></span>
      </div>
      <div className="rv20-mod" style={{ '--c': '#e30613' } as React.CSSProperties}>
        <i aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg></i>
        <span><b>The rivalry’s modifier</b><small><strong>{tw.name}:</strong> {tw.text}</small></span>
      </div>
      <Sect>Meetings</Sect>
      <Panel>
        {h.meetings.length === 0 && <span className="k-q">You haven’t met yet.</span>}
        {[...h.meetings].reverse().map((m) => (
          <div key={m.id} className="lt-meet">
            <ResultMark r={m.result} />
            <span className="k-col"><span>{scoreLine(m)}</span><span className="k-q">{m.date} · {m.round ?? m.comp}</span></span>
          </div>
        ))}
      </Panel>
      {moments.length > 0 && (
        <>
          <Sect>Moments</Sect>
          <Panel ink="#c2b2ff">
            <ul className="lt-list">{moments.slice(-6).reverse().map((x, i) => <li key={i}><b>{x.date}</b> {x.text}</li>)}</ul>
          </Panel>
        </>
      )}
    </div>
  );
}
