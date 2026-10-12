import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

export interface StoryCard {
  id: string;
  body: ReactNode;
  /** Background for the card; defaults to the ink. */
  ground?: string;
}

/** Tap-through stories: the right side goes on, the left side goes back, Escape closes. */
export function Story({ cards, onClose, label = 'Story' }: { cards: StoryCard[]; onClose: () => void; label?: string }) {
  const [i, setI] = useState(0);
  const go = (by: number) => {
    const n = i + by;
    if (n >= cards.length) onClose();
    else setI(Math.max(0, n));
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  const card = cards[i];
  if (!card) return null;
  return (
    <div className="story" role="dialog" aria-modal="true" aria-label={label} style={{ background: card.ground ?? 'var(--ink)' }}>
      <div className="story-bars" aria-hidden>
        {cards.map((c, j) => (
          <span key={c.id} className={j < i ? 'done' : j === i ? 'now' : ''} />
        ))}
      </div>
      <div className="story-body" key={card.id} aria-live="polite">
        {card.body}
      </div>
      <button type="button" className="story-tap back" aria-label="Previous" onClick={() => go(-1)} disabled={i === 0} />
      <button type="button" className="story-tap next" aria-label={i === cards.length - 1 ? 'Finish' : 'Next'} onClick={() => go(1)} />
      <button type="button" className="story-close round sm" aria-label="Close" onClick={onClose}>
        <Icon name="close" size={18} />
      </button>
      <span className="sr">
        {i + 1} of {cards.length}
      </span>
    </div>
  );
}
