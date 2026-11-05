import { useState } from 'react';
import { moodCard, type Mood, type SlowInput } from '../../domain/slowDay';
import type { Stat } from '../../domain/shakeStats';

const WORDS: [Mood, string][] = [['tired', 'Tired'], ['off', 'Off plan'], ['bored', 'Bored']];

export function HowsToday({ today, input, stat }: { today: string; input: SlowInput; stat?: Stat }) {
  const [mood, setMood] = useState<Mood | undefined>();
  const card = mood && moodCard(mood, today, input, stat);
  return (
    <section className="yu-sec">
      <h2>How's today?</h2>
      <div className="yu-seg">
        {WORDS.map(([k, t]) => <button key={k} type="button" aria-pressed={mood === k} onClick={() => setMood(mood === k ? undefined : k)}>{t}</button>)}
      </div>
      {card && (
        <div key={mood} className="yu-card yu-card-in">
          <span>{card.line}</span>
          <i className="yu-grem">"{card.gremlin}"</i>
        </div>
      )}
    </section>
  );
}
