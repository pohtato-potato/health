// Rivals: Antigoon FC always, then up to three earned, each with how it started and its modifier.
import { clubCrest } from '../../../football/art/crest';
import { clubById } from '../../../football/data/load';
import { howText, MAX_EARNED, rivalList, twistOf, type Rival } from '../../../football/rivals';
import { headToHead } from '../../../football/store/league';
import type { StoredMatch } from '../../../football/store/tables';
import { go } from '../../../router';
import { Art } from '../Tonight';

export function RivalsView({ rivals, matches }: { rivals: Rival[]; matches: StoredMatch[] }) {
  const list = rivalList(rivals);
  return (
    <>
      <div className="fb-row"><h2 className="fb-t">Rivals</h2><span className="fb-s">{list.length - 1} of {MAX_EARNED} earned</span></div>
      <ul className="fb-rivals">
        {list.map((r) => {
          const c = clubById(r.clubId);
          const h = headToHead(matches, r.clubId);
          const tw = twistOf(r);
          return (
            <li key={r.clubId}>
              <a className="fb-card fb-rival" href={`#/football/rival?id=${r.clubId}`} onClick={(e) => { e.preventDefault(); go('/football/rival', { id: r.clubId }); }}>
                <div className="fb-row">
                  <Art svg={clubCrest(c, 40)} />
                  <span className="fb-col" style={{ flex: 1 }}><b>{c.name}</b><span className="fb-s">{howText(r)}</span></span>
                </div>
                <span className="fb-s"><b>{tw.name}</b> · {tw.text}</span>
                <span className="fb-s">Played {h.meetings.length}: {h.w} won, {h.d} drawn, {h.l} lost</span>
              </a>
            </li>
          );
        })}
      </ul>
      <p className="fb-s">A club becomes a rival by beating you on a big night, three times running, or by a single goal. Beat one five times in a row and it fades. Antigoon never fades.</p>
    </>
  );
}
