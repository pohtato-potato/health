import { createContext, useContext, useLayoutEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Aurora } from '../../ui/live/Aurora';

interface Look {
  state: string;
  className: string;
  style?: CSSProperties;
}
const keyOf = (l: Look) => `${l.state}|${l.className}|${JSON.stringify(l.style ?? {})}`;
const Stage = createContext<((l: Look) => void) | null>(null);

/**
 * One aurora for a run of live screens. Each screen used to draw its own, so every switch
 * (set, checks, rest, set) built four big glowing layers from scratch: the drift jumped back
 * to its start and the colour snapped. On a stage the aurora stays put and only its tint
 * changes, gliding from one colour to the next.
 */
export function LiveStage({ children }: { children: ReactNode }) {
  const [look, setLook] = useState<Look>({ state: 'calm', className: '' });
  // Set before paint, from the frame on screen: a new value only when the look really changed.
  const [set] = useState(() => (l: Look) => setLook((cur) => (keyOf(cur) === keyOf(l) ? cur : l)));
  return (
    <Stage.Provider value={set}>
      <div className={`lv lv-stage st-${look.state}${look.className ? ` ${look.className}` : ''}`} style={look.style}>
        <Aurora />
        {children}
      </div>
    </Stage.Provider>
  );
}

/** A live-session screen: the aurora behind, tinted by `state`, with the header on top. */
export function LiveFrame({ state, className = '', style, top, scroll, children }: { state: string; className?: string; style?: CSSProperties; top?: ReactNode; scroll?: boolean; children: ReactNode }) {
  const stage = useContext(Stage);
  const styleKey = JSON.stringify(style ?? {});
  useLayoutEffect(() => {
    stage?.({ state, className, style });
    // `style` is a fresh object each render; its contents are what count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, state, className, styleKey]);
  return (
    <div className={`lv st-${state}${className ? ` ${className}` : ''}${stage ? ' lv-staged' : ''}`} style={style}>
      {!stage && <Aurora />}
      <div className="lv-body">
        <section className={scroll ? 'lv-screen lv-scroll' : 'lv-screen'}>
          {top}
          {children}
        </section>
      </div>
    </div>
  );
}

export function Primary({ children, onClick, disabled, tone }: { children: ReactNode; onClick: () => void; disabled?: boolean; tone?: string }) {
  return (
    <button type="button" className={`lv-primary${tone ? ` ${tone}` : ''}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** A time of day, "7:42 pm". */
export const timeOfDay = (ms: number) => new Date(ms).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
