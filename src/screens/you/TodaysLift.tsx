import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { LiftCard, LiftKind } from '../../domain/liftDeck';
import { Icon, type IconName } from '../../ui/Icon';

export type { LiftCard } from '../../domain/liftDeck';

const KINDS: { kind: LiftKind; label: string; c: string; icon: IconName }[] = [
  { kind: 'know', label: 'Did you know', c: '#8fd8ff', icon: 'search' },
  { kind: 'finding', label: 'A finding', c: '#5fe3a1', icon: 'trend' },
  { kind: 'lift', label: 'A lift', c: '#ffc94d', icon: 'win' },
  { kind: 'surprise', label: 'Surprise', c: '#b9a0ff', icon: 'bolt' },
];
const look = (k: LiftKind) => KINDS.find((x) => x.kind === k)!;
const SWIPE_PX = 40;

/**
 * Today's lift as a deck (board W6, y6-deck): one card on top with its kind, number and picture; the next two peek behind.
 * Swipe, the arrows, or a kind's button moves through it. The shine and the bobbing picture loop; the words never move on their own.
 */
export function LiftDeck({ cards }: { cards: LiftCard[] }) {
  const [at, setAt] = useState(0);
  const [dir, setDir] = useState<'next' | 'back' | undefined>();
  const start = useRef<number | undefined>(undefined);
  if (!cards.length) return null;
  const n = cards.length;
  const i = Math.min(at, n - 1);
  const card = cards[i];
  const k = look(card.kind);
  const move = (to: number, d: 'next' | 'back') => { setDir(d); setAt((to + n) % n); };
  const down = (e: PointerEvent) => { start.current = e.clientX; };
  const up = (e: PointerEvent) => {
    if (start.current === undefined) return;
    const dx = e.clientX - start.current;
    start.current = undefined;
    if (dx < -SWIPE_PX) move(i + 1, 'next');
    else if (dx > SWIPE_PX) move(i - 1, 'back');
  };
  const behind = [cards[(i + 1) % n], cards[(i + 2) % n]].slice(0, Math.min(2, n - 1));
  return (
    <section className="yu-dk" aria-roledescription="deck" aria-label="Today’s lift">
      <div className="yu-dk-h"><h2>Today’s lift</h2><span>{n} card{n === 1 ? '' : 's'}</span></div>
      <div className="yu-dk-st" onPointerDown={down} onPointerUp={up} onPointerCancel={() => { start.current = undefined; }}>
        {behind.map((b, j) => <i key={j} aria-hidden="true" className={`yu-dk-bk b${j}`} style={{ '--c': look(b.kind).c } as CSSProperties} />)}
        <article key={i} className={`yu-dk-c${dir ? ` ${dir}` : ''}`} style={{ '--c': k.c } as CSSProperties} aria-live="polite">
          <span className="yu-dk-sh" aria-hidden="true" />
          <div className="yu-dk-top"><span className="yu-dk-tag"><Icon name={k.icon} size={18} stroke={2.2} />{k.label}</span><span className="yu-dk-no">{i + 1} of {n}</span></div>
          <div className="yu-dk-art" aria-hidden="true"><Icon name={k.icon} size={64} stroke={1.6} /></div>
          <b>{card.head}</b>
          {card.sub && <span className="yu-dk-s">{card.sub}</span>}
        </article>
      </div>
      {n > 1 && (
        <div className="yu-dk-nav">
          <button type="button" aria-label="Previous card" onClick={() => move(i - 1, 'back')}><Icon name="left" size={22} stroke={2.2} /></button>
          <div className="yu-dk-kinds">
            {KINDS.filter((x) => cards.some((c) => c.kind === x.kind)).map((x) => (
              <button key={x.kind} type="button" aria-pressed={x.kind === card.kind} style={{ '--c': x.c } as CSSProperties}
                onClick={() => { const to = cards.findIndex((c) => c.kind === x.kind); if (to !== i) move(to, to > i ? 'next' : 'back'); }}>{x.label}</button>
            ))}
          </div>
          <button type="button" aria-label="Next card" onClick={() => move(i + 1, 'next')}><Icon name="right" size={22} stroke={2.2} /></button>
        </div>
      )}
    </section>
  );
}
