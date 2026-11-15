import { useState } from 'react';
import { surprise, type BrowseInput } from '../../domain/browse';
import { seeded } from '../../domain/creatures';
import { statDeck } from '../../domain/shakeStats';
import { Panel } from '../../ui/kit/Kit';

/** "Did you know", as board one draws it under Today's lift: one plain line. */
export function DidYouKnow({ input }: { input: BrowseInput }) {
  const deck = input.days.length ? statDeck(input) : [];
  const fact = deck.length ? deck[Math.floor(seeded(`know:${input.today}`)() * deck.length)] : undefined;
  if (!fact) return null;
  return <p className="k-line">Did you know: {fact.text.replace(/^./, (c) => c.toLowerCase())}</p>;
}

/** Surprise me: a quiet pill; each tap brings one more fact in a filled panel. */
export function Surprise({ input }: { input: BrowseInput }) {
  const [tap, setTap] = useState(0);
  const pick = tap ? surprise(`${input.today}:${tap}`, input) : undefined;
  return (
    <>
      <div className="k-pills"><button type="button" className="k-pill" onClick={() => setTap(tap + 1)}>{tap ? 'Another' : 'Surprise me'}</button></div>
      {tap > 0 && (
        <Panel key={tap} ink="#c2b2ff" className="k-in">
          <span>{pick?.text ?? 'Not enough logged for a surprise yet. Give it a few days.'}</span>
          {pick?.sub && <span className="k-q">{pick.sub}</span>}
        </Panel>
      )}
    </>
  );
}
