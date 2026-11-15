// One rivalry: the record, every meeting, and the moments between you (look pass L4: on the kit).
import { clubCrest } from '../../../football/art/crest';
import { clubById } from '../../../football/data/load';
import { howText, twistOf, type Rival } from '../../../football/rivals';
import { headToHead } from '../../../football/store/league';
import type { StoredMatch } from '../../../football/store/tables';
import { Panel, Sect } from '../../../ui/kit/Kit';
import { ResultMark } from '../league/Table';
import { Art, scoreLine } from '../Tonight';

const CORAL = '#ff9a76';

export function RivalryView({ r, matches }: { r: Rival; matches: StoredMatch[] }) {
  const c = clubById(r.clubId);
  const h = headToHead(matches, r.clubId);
  const tw = twistOf(r);
  const moments = h.meetings.flatMap((m) => m.events.moments.map((x) => ({ date: m.date, text: x })));
  return (
    <div className="lt-story">
      <header className="lt-rhead lg">
        <Art svg={clubCrest(c, 64)} />
        <span className="k-col"><b className="lt-rname">{c.name}</b><span className="k-q">{howText(r)}{r.since ? ` Since ${r.since}.` : ''}</span></span>
      </header>
      <Panel ink={CORAL} className="lt-record">
        <span className="lt-h2h">
          <span><b className="k-num">{h.w}</b><span className="k-q">won</span></span>
          <span><b className="k-num">{h.d}</b><span className="k-q">drawn</span></span>
          <span><b className="k-num">{h.l}</b><span className="k-q">lost</span></span>
        </span>
        <span className="lt-twist"><b>{tw.name}:</b> {tw.text}</span>
      </Panel>
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
