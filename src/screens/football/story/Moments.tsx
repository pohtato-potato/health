// Moments: the scrapbook (board 19, s19-book): a card for every screamer, wonder save, giant beaten and run of wins,
// filtered by kind, each giant opening its own page. Upsets against you stay listed below.
import { useState } from 'react';
import type { PageKind, ScrapPage, Upset } from '../../../football/seasonStory';
import { Icon } from '../../../ui/Icon';
import { Panel, Sect } from '../../../ui/kit/Kit';

const LAV = '#c2b2ff';
const KINDS: { id: PageKind | 'all'; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'scr', label: 'Screamers' }, { id: 'sav', label: 'Saves' }, { id: 'giant', label: 'Giants' }, { id: 'run', label: 'Runs' },
];
const INK: Record<PageKind, string> = { scr: '#c86bff', sav: '#93c3dc', giant: '#8fdcb6', run: '#ffd36b' };
const TILT = [-3, 3, -2, 4, -4, 2];

export function Scrapbook({ cards, onOpen }: { cards: ScrapPage[]; onOpen?: (c: ScrapPage) => void }) {
  const [kind, setKind] = useState<PageKind | 'all'>('all');
  const shown = kind === 'all' ? cards : cards.filter((c) => c.kind === kind);
  return (
    <section className="sk19-book" aria-label="The scrapbook">
      <h2 className="sk19-hd">The scrapbook</h2>
      <div className="sk19-fl" role="group" aria-label="Kinds of moment">
        {KINDS.map((k) => (
          <button key={k.id} type="button" aria-pressed={kind === k.id} onClick={() => setKind(k.id)}>
            <b>{k.id === 'all' ? cards.length : cards.filter((c) => c.kind === k.id).length}</b>{k.label}
          </button>
        ))}
      </div>
      {shown.length === 0
        ? <p className="sk19-none">{cards.length ? 'None of these yet.' : 'Nothing pinned yet. Each screamer, wonder save, giant beaten and run of five wins gets a card the night it happens.'}</p>
        : (
          <ul className="sk19">
            {shown.map((c, i) => (
              <li key={c.id} className={`sk19-c k-${c.kind}`} style={{ '--c': INK[c.kind], '--r': `${TILT[i % TILT.length]}deg`, '--d': `${Math.min(i, 6) * 0.08}s` } as React.CSSProperties}>
                <em>{c.title}</em>
                <b>{c.line}</b>
                <span>{c.sub}</span>
                {c.kind === 'giant' && <button type="button" className="op" onClick={() => onOpen?.(c)} aria-label={`Open: ${c.title}, ${c.line}`}>Open<Icon name="right" size={18} stroke={2.4} /></button>}
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}

export function MomentsView({ cards, upsets }: { cards: ScrapPage[]; upsets: Upset[] }) {
  const against = upsets.filter((u) => u.dir === 'against');
  return (
    <div className="lt-story">
      <Scrapbook cards={cards} />
      <Sect>Upsets against you · {against.length}</Sect>
      <Panel ink={LAV}>
        {against.length === 0 && <span className="k-q">None yet.</span>}
        <ul className="lt-list lt-ups">{[...against].reverse().slice(0, 12).map((u) => <li key={u.id}><Icon name="down" size={16} stroke={2.4} color={LAV} /><span><b>{u.text}</b> · {u.date}</span></li>)}</ul>
      </Panel>
    </div>
  );
}
