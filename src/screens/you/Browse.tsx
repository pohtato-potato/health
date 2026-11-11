import { useState, type CSSProperties } from 'react';
import { surprise, type BrowseInput } from '../../domain/browse';
import { seeded } from '../../domain/creatures';
import { statDeck } from '../../domain/shakeStats';
import { HUE } from '../../ui/you/palette';

const tint = (c: string) => ({ '--c': c }) as CSSProperties;

export function Browse({ input }: { input: BrowseInput }) {
  const [tap, setTap] = useState(0);
  const deck = input.days.length ? statDeck(input) : [];
  const fact = deck.length ? deck[Math.floor(seeded(`know:${input.today}`)() * deck.length)] : undefined;
  const pick = tap ? surprise(`${input.today}:${tap}`, input) : undefined;
  return (
    <>
      {fact && <div className="yu-card yu-tint" style={tint(HUE.sleep)}><b>Did you know</b><span className="yu-q">{fact.text}</span></div>}
      <button type="button" className="yu-surprise" onClick={() => setTap(tap + 1)}>Surprise me</button>
      {tap > 0 && (
        <div key={tap} className="yu-card yu-card-in">
          <span>{pick?.text ?? 'Not enough logged for a surprise yet. Give it a few days.'}</span>
          {pick?.sub && <span className="yu-q">{pick.sub}</span>}
        </div>
      )}
    </>
  );
}
