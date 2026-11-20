// Club's foot at dusk (board 19, c19-dusk). Pure view.
import type { ReactNode } from 'react';
import { Art } from '../Tonight';

/**
 * The foot of Club (c19-dusk): the page fades into a dusk sky with the Kaai and its reflection (drawing only, hidden from
 * screen readers), then the crest in an orange ring, the club's standing and four facts on one line.
 */
export function DuskFoot({ crest, name, under, facts, sky, story }: { crest: string; name: string; under: string; facts: [string, string][]; sky: ReactNode; story: string }) {
  return (
    <footer className="c19-foot">
      <div className="c19-sky" aria-hidden="true">{sky}<div className="c19-refl">{sky}</div></div>
      <div className="c19-id"><span className="c19-md"><Art svg={crest} /></span><div><b>{name}</b><span>{under}</span></div></div>
      <p className="c19-story">{story}</p>
      <ul className="c19-ft">{facts.map(([v, w]) => <li key={w}><b>{v}</b>{w}</li>)}</ul>
    </footer>
  );
}
