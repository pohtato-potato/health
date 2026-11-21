// Seasons as a carousel (board 21, s21-seasons): a pennant per season, newest first, swiped or stepped with the arrows,
// each with its finish, record, cups, kit and crest, and its Season Wrapped.
import { useRef, useState } from 'react';
import { tierName } from '../../../football/data/load';
import { seasonName } from '../../../football/pyramid/redraw';
import type { SeasonSummary } from '../../../football/seasonStory';
import { go } from '../../../router';
import { Icon } from '../../../ui/Icon';

const ord = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
const INK = { now: '#ff9a76', up: '#ffd36b', down: '#93c3dc', stay: '#c2b2ff' } as const;

export function SeasonsView({ list, kitOf, crestOf }: { list: SeasonSummary[]; kitOf?: (s: number) => string; crestOf?: (s: number) => string }) {
  const rail = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const items = [...list].reverse();
  const step = (to: number) => {
    const i = Math.max(0, Math.min(items.length - 1, to));
    setAt(i);
    (rail.current?.children[i] as HTMLElement | undefined)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };
  const onScroll = () => {
    const r = rail.current;
    if (!r || !r.children.length) return;
    const w = (r.children[0] as HTMLElement).offsetWidth + 14;
    setAt(Math.max(0, Math.min(items.length - 1, Math.round(r.scrollLeft / w))));
  };
  if (!items.length) return <div className="lt-story"><p className="k-q">The first season is still to come.</p></div>;
  return (
    <div className="lt-story cs21-wrap">
      <div className="cs21" ref={rail} onScroll={onScroll} tabIndex={0} aria-label="Seasons, newest first. Swipe or use the arrows.">
        {items.map((s, i) => {
          const ink = s.pos == null ? INK.now : INK[s.move ?? 'stay'];
          return (
            <div key={s.season} className={`cs21-p${i === at ? ' on' : ''}`} style={{ '--c': ink, '--d': `${0.15 + i * 0.12}s`, '--sw': `${-i * 1.5}s` } as React.CSSProperties}
              role="group" aria-label={`${seasonName(s.season)}, ${i + 1} of ${items.length}`}>
              <small>{seasonName(s.season)}{s.pos == null ? ' · now' : ''}</small>
              <b>{tierName(s.tier)}</b>
              <strong>{s.pos ? ord(s.pos) : `${s.record.W}–${s.record.L}`}</strong>
              <span>{s.pos ? (s.move === 'up' ? 'Promoted' : s.move === 'down' ? 'Relegated' : 'Stayed up') : 'Still playing · won–lost so far'}</span>
              <span>{s.record.W} won, {s.record.D} drawn, {s.record.L} lost</span>
              {s.cups.map((c) => <span key={c} className="cs21-cup">{c}</span>)}
              {(kitOf || crestOf) && <span className="cs21-kit">{[kitOf?.(s.season), crestOf?.(s.season)].filter(Boolean).join(' · ')}</span>}
              <button type="button" className="cs21-wr" onClick={() => go('/football/wrapped', { season: String(s.season) })}>Season Wrapped</button>
            </div>
          );
        })}
      </div>
      <div className="dt21">
        <button type="button" aria-label="Newer season" disabled={at === 0} onClick={() => step(at - 1)}><Icon name="left" size={20} stroke={2.4} /></button>
        {items.map((s, i) => <i key={s.season} className={`cs21-dot${i === at ? ' on' : ''}`} aria-hidden="true" />)}
        <button type="button" aria-label="Older season" disabled={at === items.length - 1} onClick={() => step(at + 1)}><Icon name="right" size={20} stroke={2.4} /></button>
      </div>
      <p className="cs21-at" aria-live="polite">{seasonName(items[at].season)}, {at + 1} of {items.length}</p>
    </div>
  );
}
