import { useState } from 'react';
import { moodCard, type Mood, type SlowInput } from '../../domain/slowDay';
import type { Stat } from '../../domain/shakeStats';
import { Panel, Sect } from '../../ui/kit/Kit';

const WORDS: [Mood, string][] = [['tired', 'Tired'], ['off', 'Off plan'], ['bored', 'Bored']];

/** How's today (look pass): three choices as pills, the answer in a filled panel. */
export function HowsToday({ today, input, stat }: { today: string; input: SlowInput; stat?: Stat }) {
  const [mood, setMood] = useState<Mood | undefined>();
  const card = mood && moodCard(mood, today, input, stat);
  return (
    <>
      <Sect>How’s today?</Sect>
      <div className="k-pills" role="group" aria-label="How's today?">
        {WORDS.map(([k, t]) => <button key={k} type="button" className="k-pill" aria-pressed={mood === k} onClick={() => setMood(mood === k ? undefined : k)}>{t}</button>)}
      </div>
      {card && (
        <Panel key={mood} ink="#f4aedb" className="k-in">
          <span>{card.line}</span>
          {card.gremlin && <i className="k-q">“{card.gremlin}”</i>}
        </Panel>
      )}
    </>
  );
}
