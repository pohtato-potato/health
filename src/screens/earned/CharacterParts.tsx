import type { CSSProperties } from 'react';
import { Icon } from '../../ui/Icon';

/** Each title tile takes one of these, in turn, so the wardrobe reads as a rack of colours. */
export const TITLE_INKS = ['#ff9a5c', '#ffc94d', '#b9a0ff', '#4fd2ff', '#5fe3a1', '#ff6fa8', '#ffd59a'];
const ink = (c: string) => ({ '--c': c }) as CSSProperties;
/** A name with a word too long for half the width takes the whole row rather than breaking mid-word. */
const wide = (name: string) => (name.split(' ').some((w) => w.length > 12) ? ' wide' : '');

/** The title you wear, on a plate with a turning rainbow edge. */
export function Nameplate({ worn, level, earned }: { worn?: string; level: number; earned: number }) {
  return (
    <div className="ch-plate">
      <div>
        <span>Wearing</span>
        <b>{worn ?? 'Nothing yet'}</b>
        <span className="ch-lv">Level {level} · {earned} earned</span>
      </div>
    </div>
  );
}

export interface WardrobeRow { id: string; name: string; how: string; has: boolean }

/** Every title as a tile: earned ones are buttons (the worn one filled), locked ones dashed with how to earn them. */
export function Wardrobe({ rows, worn, onWear }: { rows: WardrobeRow[]; worn?: string; onWear: (r: WardrobeRow) => void }) {
  if (!rows.length) return <p className="ch-none">No titles yet. They come from what you log.</p>;
  return (
    <div className="ch-tt">
      {rows.map((r, i) => r.has
        ? <button key={r.id} type="button" className={`ch-t${r.id === worn ? ' on' : ''}${wide(r.name)}`} style={ink(TITLE_INKS[i % TITLE_INKS.length])} aria-pressed={r.id === worn} onClick={() => onWear(r)}><b>{r.name}</b><span>{r.id === worn ? 'Wearing' : r.how}</span></button>
        : <div key={r.id} className={`ch-t locked${wide(r.name)}`} style={ink(TITLE_INKS[i % TITLE_INKS.length])}><b>{r.name}</b><span>{r.how}</span></div>)}
    </div>
  );
}

export interface RewardRow { id: string; name: string; c: string; open: boolean; on: boolean; line: string; onToggle: (v: boolean) => void }

/** Rewards you switch on and off. A locked one stays, disabled, saying how to unlock it. */
export function RewardRows({ rows }: { rows: RewardRow[] }) {
  return (
    <div className="ch-sw">
      {rows.map((r) => {
        const on = r.open && r.on;
        return (
          <button key={r.id} type="button" role="switch" aria-checked={on} disabled={!r.open} className={`ch-r${r.open ? '' : ' locked'}`} style={ink(r.c)} onClick={() => r.onToggle(!on)}>
            <i aria-hidden="true">{!r.open && <Icon name="lock" size={16} color="#140f22" />}</i>
            <span className="ch-rn"><b>{r.name}</b><span>{r.line}</span></span>
            <em className={on ? 'on' : undefined} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

export interface Swatch { id: string; name: string; colours: string[] }

/** The themes you can wear, as swatches with their names. */
export function ThemeSwatches({ themes, picked, onPick }: { themes: Swatch[]; picked: string; onPick: (id: string) => void }) {
  return (
    <div className="ch-thm">
      {themes.map((t) => (
        <button key={t.id} type="button" aria-pressed={t.id === picked} onClick={() => onPick(t.id)}>
          <i style={{ background: `linear-gradient(135deg, ${t.colours[1]}, ${t.colours[2] ?? t.colours[1]} 60%, ${t.colours[0]})` }} aria-hidden="true" />
          <span>{t.name}</span>
        </button>
      ))}
    </div>
  );
}
