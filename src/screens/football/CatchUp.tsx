// Catch-up (spec §5.9): "N while you were away". Watch them as one reel (key chances only) or just see the results.
import { useState } from 'react';
import { markWatched } from '../../football/store/save';
import type { StoredMatch } from '../../football/store/tables';
import type { ChanceEvent } from '../../football/types';
import { go } from '../../router';
import { scoreLine } from './Tonight';
import { Action, Panel } from '../../ui/kit/Kit';

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
      <Panel ink="#c2b2ff" className="lt-away">
        <b className="k-lb">While you were away</b>
        <ul className="lt-list">{ms.map((m) => <li key={m.id}>{m.round ? `${m.round}: ` : ''}{scoreLine(m)}</li>)}</ul>
        <Action quiet sm onClick={() => void Promise.all(ms.map((m) => markWatched(m.id)))}>Got it</Action>
      </Panel>
    );
  }
  return (
    <Panel ink="#c2b2ff" className="lt-away">
      <div className="k-row"><b className="k-lb">{ms.length} while you were away</b><span className="k-q">sealed</span></div>
      <span className="k-q">{ms.length > 4 ? `${ms.slice(0, 3).map((m) => m.round ?? m.date).join(', ')} and ${ms.length - 3} more.` : ms.map((m) => m.round ?? m.date).join(', ')}</span>
      <div className="lt-two">
        <Action quiet sm onClick={() => go('/football/match', { reel: '1' })}>Watch as one reel</Action>
        <Action quiet sm onClick={() => setShown(true)}>Just the results</Action>
      </div>
    </Panel>
  );
}
