import { routeById } from '../../walk/catalogue';
import { RouteArt, inkStyle } from '../../walk/ui/RouteArt';
import { Icon } from '../../ui/Icon';

const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');

/**
 * A challenge on the Walk tab, as a map card: the route on its land in a band with its era stamp (and a ribbon for
 * a book route), then its name, km walked of its length, and today's line. A set-down route says so in words.
 */
export function ChallengeCard({ id, km, state, line, target, onOpen }: { id: string; km: number; state: 'walking' | 'set down'; line?: string; target?: string; onOpen: () => void }) {
  const r = routeById(id);
  if (!r) return null;
  return (
    <button type="button" className={`walk-rc${state === 'set down' ? ' down' : ''}`} style={inkStyle(id)} onClick={onOpen}>
      <span className="walk-rc-band">
        <RouteArt id={id} km={km} />
        <span className="walk-era-stamp" aria-hidden="true">
          {r.era}
        </span>
        {r.book && <span className="walk-ribbon" aria-hidden="true" />}
      </span>
      <span className="walk-rc-panel">
        <span className="walk-rc-name">{r.name}</span>
        <span className="walk-rc-nums">
          <b>{fmt(km)}</b>
          <span>of {fmt(r.km)} km</span>
          {state === 'set down' && <span className="walk-rc-state">Set down</span>}
        </span>
        {line && <span className="walk-rc-line">{line}</span>}
        {target && <span className="walk-rc-target">{target}</span>}
      </span>
    </button>
  );
}

/** An expedition as a slim line at the bottom of the Walk tab: its thumbnail, name and km. */
export function ExpeditionLine({ id, km, state, onOpen }: { id: string; km: number; state: 'walking' | 'set down'; onOpen: () => void }) {
  const r = routeById(id);
  if (!r) return null;
  return (
    <button type="button" className="walk-exp" style={inkStyle(id)} onClick={onOpen}>
      <span className="walk-exp-art">
        <RouteArt id={id} km={km} kind="thumb" />
      </span>
      <span className="walk-exp-text">
        <span className="walk-exp-name">{r.name}</span>
        <span className="walk-exp-meta">
          {fmt(km)} of {fmt(r.km)} km{state === 'set down' ? ' · set down' : ''}
        </span>
      </span>
      <Icon name="right" size={18} stroke={1.8} />
    </button>
  );
}
