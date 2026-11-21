import type { CSSProperties } from 'react';

const INKS = ['#ffb27a', '#c2b2ff', '#5fe3a1', '#8fd8ff', '#f4aedb', '#ffd36b'];

export interface ArchTile { id: string; name: string; sub: string; onOpen: () => void }

/** A shelf of past weeks or months as coloured tiles that pop in (board 23), with the count by the heading. */
export function ArchTiles({ title, tiles, from = 0 }: { title: string; tiles: ArchTile[]; from?: number }) {
  if (!tiles.length) return null;
  return (
    <section className="ar-sec">
      <div className="ar-hd"><h2 className="ar-h">{title}</h2><span>{tiles.length}</span></div>
      <div className="ar-g">
        {tiles.map((t, k) => (
          <button key={t.id} type="button" onClick={t.onOpen} style={{ '--c': INKS[(from + k) % INKS.length], '--d': `${Math.min(k, 10) * 0.06}s` } as CSSProperties}>
            <b>{t.name}</b><span>{t.sub}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
