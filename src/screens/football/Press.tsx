// The press conference: optional, one tap. Every answer is a joke; the one you pick is tomorrow's headline.
import { useState } from 'react';
import { REVIEWS } from '../../football/data/press';
import { fill, pressHeadline, pressItem, type Facts } from '../../football/news';
import { hashSeed } from '../../football/rng';
import { Gremlin } from './Studio';

export interface PressProps { matchId: string; lineId: string; facts: Facts; answered?: number; startOpen?: boolean; onAnswer: (i: 0 | 1 | 2) => Promise<unknown> }

export function Press({ matchId, lineId, facts, answered, startOpen = false, onAnswer }: PressProps) {
  const item = pressItem(lineId);
  const [open, setOpen] = useState(startOpen || answered !== undefined);
  const [picked, setPicked] = useState<number | undefined>(answered);
  if (!item) return null;
  if (!open) return <button type="button" className="fb-btn" onClick={() => setOpen(true)}>Face the press</button>;
  const head = picked !== undefined ? pressHeadline(lineId, picked, facts) : undefined;
  const review = picked !== undefined ? REVIEWS[hashSeed(matchId, String(picked)) % REVIEWS.length] : undefined;
  return (
    <section className="fb-press" aria-label="Press conference">
      <span className="fb-lb">Press conference</span>
      <div className="fb-q"><b>Gazet van de Kaai</b><span>“{fill(item.q, facts)}”</span></div>
      {picked === undefined ? (
        <div className="fb-answers">
          {item.a.map((a, i) => (
            <button key={i} type="button" className="fb-btn fb-answer" onClick={() => { setPicked(i); void onAnswer(i as 0 | 1 | 2); }}>{fill(a, facts)}</button>
          ))}
        </div>
      ) : (
        <>
          <p className="fb-said">“{fill(item.a[picked], facts)}”</p>
          <div className="fb-headline"><span className="fb-lb">Tomorrow’s back page</span><b>{head?.toUpperCase()}</b></div>
          <div className="fb-review"><Gremlin /><p><b>Gremlin</b><span>{review}</span></p></div>
        </>
      )}
    </section>
  );
}
