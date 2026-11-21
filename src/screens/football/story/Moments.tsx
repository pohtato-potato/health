// Moments: the scrapbook (board 19, s19-book): a card for every screamer, wonder save, giant beaten and run of wins,
// filtered by kind, each giant opening its own page (s19-giant). Upsets against you stay listed below.
import { useState } from 'react';
import type { PageKind, ScrapPage, Upset } from '../../../football/seasonStory';
import { Icon } from '../../../ui/Icon';
import { Panel, Sect } from '../../../ui/kit/Kit';
import { go } from '../../../router';
import { Crest } from '../cup/CupArt';

type Own = { step: 1 | 2 | 3 | 4 | 5; opt: 'a' | 'b' | 'c' | 'd' | 'e' };

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

const CRACKS = [[0.3, 60], [1.3, 70], [2.2, 64], [3.3, 72], [4.3, 60], [5.3, 66]] as const;
const dayLong = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

/** A giant beaten (board 19, s19-giant): their crest towers, yours flies in and cracks it; the score is said in words too. */
export function GiantBeaten({ c, own, onBack }: { c: ScrapPage; own?: Own; onBack: () => void }) {
  const m = c.m!, gap = c.gap ?? 1;
  const tiers = `${gap} ${gap === 1 ? 'tier' : 'tiers'}`;
  const facts = [m.round ?? (m.comp === 'league' ? 'League' : 'Cup'), m.score[1] === 0 ? 'Clean sheet' : `Won ${m.score[0]}–${m.score[1]}`, m.braboHome ? 'At home' : 'Away'];
  return (
    <section className="gb19" aria-label="Giant beaten">
      <div className="gt19" role="img" aria-label={`Their crest cracking as yours hits it, ${tiers} above you`}>
        <span className="big"><Crest id={m.opp} size={180} /></span>
        <svg className="crk" viewBox="0 0 190 190" aria-hidden="true">
          {CRACKS.map(([a, l], k) => <path key={k} style={{ '--d': `${1.1 + k * 0.06}s` } as React.CSSProperties}
            d={`M95 95 L${(95 + l * 0.55 * Math.cos(a)).toFixed(0)} ${(95 + l * 0.55 * Math.sin(a)).toFixed(0)} L${(95 + l * Math.cos(a + 0.2)).toFixed(0)} ${(95 + l * Math.sin(a + 0.2)).toFixed(0)}`} />)}
        </svg>
        <span className="sm"><Crest id="bra" size={80} own={own ?? { step: 1, opt: 'a' }} /></span>
        <span className="tier"><b>{tiers}</b> above you</span>
      </div>
      <b className="word">Giant beaten</b>
      <p className="score">{c.line}</p>
      <p className="line">{dayLong(m.date)}.</p>
      <ul className="facts">{facts.map((f) => <li key={f}>{f}</li>)}</ul>
      <div className="nx2">
        <button type="button" onClick={() => go('/football/match', { id: m.id })}>Watch it back</button>
        <button type="button" onClick={onBack}>Back to the scrapbook</button>
      </div>
    </section>
  );
}

export function MomentsView({ cards, upsets, own }: { cards: ScrapPage[]; upsets: Upset[]; own?: Own }) {
  const [open, setOpen] = useState<ScrapPage | null>(null);
  const against = upsets.filter((u) => u.dir === 'against');
  if (open?.m) return <div className="lt-story"><GiantBeaten c={open} own={own} onBack={() => setOpen(null)} /></div>;
  return (
    <div className="lt-story">
      <Scrapbook cards={cards} onOpen={setOpen} />
      <Sect>Upsets against you · {against.length}</Sect>
      <Panel ink={LAV}>
        {against.length === 0 && <span className="k-q">None yet.</span>}
        <ul className="lt-list lt-ups">{[...against].reverse().slice(0, 12).map((u) => <li key={u.id}><Icon name="down" size={16} stroke={2.4} color={LAV} /><span><b>{u.text}</b> · {u.date}</span></li>)}</ul>
      </Panel>
    </div>
  );
}
