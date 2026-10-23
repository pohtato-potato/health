import type { CSSProperties } from 'react';
import { RouteArt, byId, fmt, inkOf } from './walkArt';

/**
 * Design prototype: the map card, the chosen look for challenge cards and shelf cards. Each route keeps its own
 * ink: a radial glow behind its land, the border, and the walked line.
 */

export interface CardData {
  id: string;
  km: number;
  day: number;
  stretch: string;
  line: string;
  target?: string;
}

/** A challenge on the Walk tab: the route on its land in a band, the words on a panel below. */
export function ChallengeCard({ c, onOpen, delay = 0 }: { c: CardData; onOpen: () => void; delay?: number }) {
  const r = byId(c.id);
  return (
    <button type="button" className="wp-rc rise" style={{ ...inkOf(c.id), animationDelay: `${delay}ms` } as CSSProperties} onClick={onOpen}>
      <span className="wp-rc-band">
        <RouteArt id={c.id} frac={c.km / r.km} />
        <span className="wp-era-stamp" aria-hidden="true">
          {r.era}
        </span>
        {r.book && <span className="wp-ribbon" aria-hidden="true" />}
      </span>
      <span className="wp-rc-panel">
        <span className="wp-rc-name">{r.name}</span>
        <span className="wp-rc-nums">
          <b>{fmt(c.km)}</b>
          <span>
            of {fmt(r.km)} km · {c.stretch}
          </span>
        </span>
        <span className="wp-rc-line">{c.line}</span>
        {c.target && <span className="wp-rc-target">{c.target}</span>}
      </span>
    </button>
  );
}

/** A route on the shelf: its land and line, its name, length and time. */
export function ShelfCard({ id, time, onOpen, delay = 0 }: { id: string; time: string; onOpen: () => void; delay?: number }) {
  const r = byId(id);
  const kind = r.km > 1500 ? 'Expedition' : r.book ? 'Book' : '';
  return (
    <button type="button" role="listitem" className="wp-sc rise" style={{ ...inkOf(id), animationDelay: `${delay}ms` } as CSSProperties} onClick={onOpen}>
      <span className="wp-sc-art">
        <RouteArt id={id} frac={0} kind="thumb" label={`${r.name} on its map`} />
      </span>
      <span className="wp-sc-text">
        <span className="wp-sc-name">{r.name}</span>
        <span className="wp-sc-meta">
          {fmt(r.km)} km · {time}
        </span>
        <span className="wp-sc-era">{kind ? `${r.era} · ${kind}` : r.era}</span>
      </span>
    </button>
  );
}
