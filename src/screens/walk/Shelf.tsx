import type { RouteRun } from '../../domain/types';
import { GROUP_NAMES, RECORD_NAMES, kindOf, type Group, type RouteDef } from '../../walk/catalogue';
import { timeAtPace } from '../../walk/page';
import { runState } from '../../walk/runs';
import { RouteArt, inkStyle } from '../../walk/ui/RouteArt';

const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');
const GROUPS: Group[] = ['india', 'world', 'books', 'wild'];
const KIND = { challenge: 'Challenge', expedition: 'Expedition' };

/** Where a route stands for you, in words: nothing if you've never joined it. */
function standing(def: RouteDef, runs: RouteRun[], km: number): string | undefined {
  const run = runs.find((r) => r.id === def.id);
  if (!run) return undefined;
  return { walking: 'Walking', 'set down': 'Set down', finished: 'Finished' }[runState(run, def, km)];
}

/** One route on the shelf, as a map card: its land and line, its era stamp, then length, time at your pace and its hook. */
function ShelfCard({ def, km, state, pinned, usualKm, onOpen }: { def: RouteDef; km: number; state?: string; pinned: boolean; usualKm: number; onOpen: () => void }) {
  return (
    <button type="button" className="walk-rc walk-shelf-card" style={inkStyle(def.id)} onClick={onOpen}>
      <span className="walk-rc-band">
        <RouteArt id={def.id} km={km} />
        <span className="walk-era-stamp" aria-hidden="true">
          {def.era}
        </span>
        {def.book && <span className="walk-ribbon" aria-hidden="true" />}
      </span>
      <span className="walk-rc-panel">
        <span className="walk-rc-name">{def.name}</span>
        <span className="walk-rc-nums">
          <span>
            {KIND[kindOf(def)]} · {fmt(def.km)} km · {timeAtPace(def.km, usualKm)} at your pace
          </span>
          {state && <span className="walk-rc-state">{state}</span>}
          {pinned && !state && <span className="walk-rc-state">Pinned</span>}
        </span>
        <span className="walk-rc-line">{def.hook}</span>
      </span>
    </button>
  );
}

/** The shelf: "Choose for me", then the ready routes by group; in development, the drafts below. */
export function ShelfView(p: { defs: RouteDef[]; runs: RouteRun[]; kmById: Map<string, number>; pinned: Set<string>; usualKm: number; onOpen: (id: string) => void; onChoose: () => void; drafts?: boolean }) {
  const card = (d: RouteDef) => <ShelfCard key={d.id} def={d} km={p.kmById.get(d.id) ?? 0} state={standing(d, p.runs, p.kmById.get(d.id) ?? 0)} pinned={p.pinned.has(d.id)} usualKm={p.usualKm} onOpen={() => p.onOpen(d.id)} />;
  const ready = p.defs.filter((d) => d.ready);
  const drafts = p.drafts ? p.defs.filter((d) => !d.ready) : [];
  return (
    <>
      <button type="button" className="walk-primary walk-choose" onClick={p.onChoose}>
        Choose for me
      </button>
      {GROUPS.map((g) => {
        const here = ready.filter((d) => d.group === g);
        return (
          here.length > 0 && (
            <section key={g} className="walk-section" aria-label={GROUP_NAMES[g]}>
              <h2 className="walk-h2">{GROUP_NAMES[g]}</h2>
              {here.map(card)}
            </section>
          )
        );
      })}
      {ready.length === 0 && <p className="walk-sub">The first routes are still being written. They appear here once they're checked.</p>}
      {drafts.length > 0 && (
        <section className="walk-section" aria-label="Drafts">
          <h2 className="walk-h2">Drafts (not on the shelf)</h2>
          <p className="walk-sub">Shown in development only, to check them before they're ready.</p>
          {drafts.map(card)}
        </section>
      )}
    </>
  );
}

export const TAKEN = { challenge: 'Both challenge places are taken. Set one down to join this.', expedition: 'Both expedition places are taken. Set one down to join this.' };

/** A route's sheet: what it is, where you stand with it, and Join (only with a place free), its page, a pin. */
export function RouteSheetView(p: { def: RouteDef; runs: RouteRun[]; km: number; free: { challenge: number; expedition: number }; pinned: boolean; usualKm: number; onJoin: () => void; onPage: () => void; onPin: () => void }) {
  const { def } = p;
  const kind = kindOf(def);
  const state = standing(def, p.runs, p.km);
  const canJoin = !state || state === 'Set down';
  return (
    <div className="walk-sheet-route" style={inkStyle(def.id)}>
      <p className="walk-kind">
        {def.book ? 'Book route' : KIND[kind]} · {def.era} · {RECORD_NAMES[def.record]}
      </p>
      <p className="walk-para">{def.hook}</p>
      <p className="walk-sub">
        {fmt(def.km)} km · {timeAtPace(def.km, p.usualKm)} at your pace, with no deadline
        {state ? ` · ${state}` : ''}
      </p>
      {def.book && (
        <p className="walk-para">
          <b>{def.book.by}.</b> {def.book.synopsis}
        </p>
      )}
      <div className="walk-end-btns">
        {canJoin &&
          (p.free[kind] > 0 ? (
            <button type="button" className="walk-primary" onClick={p.onJoin}>
              {state === 'Set down' ? 'Pick it up' : 'Join this walk'}
            </button>
          ) : (
            <p className="walk-para">{TAKEN[kind]}</p>
          ))}
        <button type="button" className="walk-ghost" onClick={p.onPage}>
          See its page
        </button>
        {!state && (
          <button type="button" className="walk-ghost" aria-pressed={p.pinned} onClick={p.onPin}>
            {p.pinned ? 'Pinned · unpin' : 'Pin for later'}
          </button>
        )}
      </div>
    </div>
  );
}
