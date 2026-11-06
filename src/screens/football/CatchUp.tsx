// Catch-up (spec §5.9): "N while you were away". Watch them as one reel (key chances only) or just see the results.
import { useState } from 'react';
import { markWatched } from '../../football/store/save';
import type { StoredMatch } from '../../football/store/tables';
import type { ChanceEvent } from '../../football/types';
import { go } from '../../router';
import { scoreLine } from './Tonight';

const isGoal = (c: ChanceEvent) => (c.side === 'atk' ? c.ok : !c.ok);
/** A match cut to its key chances: goals and tagged moments, or the biggest chance if nothing went in. */
export function keyChances(m: StoredMatch): StoredMatch {
  const keep = m.events.chances.filter((c) => isGoal(c) || c.tag);
  const chances = keep.length ? keep : [...m.events.chances].sort((a, b) => b.pct - a.pct).slice(0, 1);
  return { ...m, events: { ...m.events, chances } };
}

export function CatchUp({ ms, shown: start = false }: { ms: StoredMatch[]; shown?: boolean }) {
  const [shown, setShown] = useState(start);
  if (shown) {
    return (
      <section className="fb-card pu" aria-label="While you were away">
        <span className="fb-lb">While you were away</span>
        <ul className="fb-moments">{ms.map((m) => <li key={m.id}>{m.round ? `${m.round}: ` : ''}{scoreLine(m)}</li>)}</ul>
        <div className="fb-btns"><button type="button" className="fb-btn pri" onClick={() => void Promise.all(ms.map((m) => markWatched(m.id)))}>Got it</button></div>
      </section>
    );
  }
  return (
    <section className="fb-card pu" aria-label="While you were away">
      <span className="fb-lb">{ms.length} while you were away</span>
      <ul className="fb-moments">{ms.map((m) => <li key={m.id}>{m.round ?? m.date} · sealed</li>)}</ul>
      <div className="fb-btns stack">
        <button type="button" className="fb-btn" onClick={() => setShown(true)}>Just the results</button>
        <button type="button" className="fb-btn pri" onClick={() => go('/football/match', { reel: '1' })}>Watch as one reel</button>
      </div>
    </section>
  );
}
