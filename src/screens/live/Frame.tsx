import type { CSSProperties, ReactNode } from 'react';
import { Aurora } from '../../ui/live/Aurora';

/** A live-session screen: the aurora behind, tinted by `state`, with the header on top. */
export function LiveFrame({ state, saver, className = '', style, top, children }: { state: string; saver: boolean; className?: string; style?: CSSProperties; top?: ReactNode; children: ReactNode }) {
  return (
    <div className={`lv st-${state}${saver ? ' saver' : ''}${className ? ` ${className}` : ''}`} style={style}>
      <Aurora still={saver} />
      <div className="lv-body">
        <section className="lv-screen">
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
