import { useState } from 'react';
import { STOP_WORDS, type SmallStop } from '../../walk/content/types';
import { StopMark } from '../../walk/ui/StopMark';
import { Sources } from './Sources';

/** A stop's facts, one at a time: tap for the next, and it wraps round. */
export function StopFacts({ facts }: { facts: string[] }) {
  const [i, setI] = useState(0);
  return (
    <div className="walk-deck" aria-live="polite">
      <i className="walk-deck-back b2" aria-hidden="true" />
      <i className="walk-deck-back b1" aria-hidden="true" />
      <button type="button" className="walk-fact" onClick={() => setI((i + 1) % facts.length)}>
        <span className="walk-fact-text">{facts[i]}</span>
        <span className="walk-fact-foot">
          <span className="walk-dots" aria-hidden="true">
            {facts.map((_, k) => (
              <i key={k} className={k === i ? 'on' : ''} />
            ))}
          </span>
          <span>
            {i + 1} of {facts.length} · tap for the next
          </span>
        </span>
      </button>
    </div>
  );
}

/** A small stop's page: its kind in words with its mark, its name, its facts and where they come from. */
export function StopView({ stop, onBack }: { stop: SmallStop; onBack: () => void }) {
  return (
    <div className="walk-stop">
      <span className="walk-kind">
        <StopMark kind={stop.kind} />
        {STOP_WORDS[stop.kind]} · small stop
      </span>
      <h1 className="walk-title big">{stop.name}</h1>
      <StopFacts key={stop.id} facts={stop.facts} />
      <button type="button" className="walk-ghost" onClick={onBack}>
        Back to the walk
      </button>
      <Sources sources={stop.sources} />
    </div>
  );
}
