import { useState } from 'react';
import { CREATURES, stageWord, tierWord } from '../../domain/creatureRoster';
import { maxStage } from '../../domain/creatures';
import { CreatureFigure } from '../../ui/creatures/Figure';

/** Development only: every creature at every stage or form, for the owner's review. Names stay hidden until asked for. */
export function CreatureBoard() {
  const [names, setNames] = useState(false);
  return (
    <main style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 20, background: '#0c0e1d', color: '#f1ece4', minHeight: '100vh' }}>
      <h1 className="h1">Creature art board</h1>
      <p role="status" style={{ fontWeight: 700 }}>Unapproved: this art is waiting for the owner’s review.</p>
      <p className="t15">Tap a figure to see its reaction.</p>
      <button type="button" className="btn ghost" aria-pressed={names} onClick={() => setNames(!names)}>{names ? 'Hide names' : 'Show names'}</button>
      {CREATURES.map((c, n) => (
        <section key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 className="t15"><b>{n + 1}. {names ? c.name : 'Name hidden'}</b> · {tierWord(c)} · {c.reaction}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {Array.from({ length: maxStage(c.tier) }, (_, i) => (
              <figure key={i} style={{ margin: 0, width: 150 }}>
                <CreatureFigure c={c} stage={i + 1} width={150} burst={false} draw={false} />
                <figcaption className="t14">{stageWord(c, i + 1)}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
