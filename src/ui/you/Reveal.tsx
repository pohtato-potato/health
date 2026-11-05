import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { canAnimate, onFirstView } from './motion';

/** Plays its children's arrival the first time it scrolls into view. Layout never moves. */
export function Reveal({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [armed] = useState(canAnimate);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!armed || !ref.current) return;
    return onFirstView(ref.current, () => setSeen(true));
  }, [armed]);
  const state = armed ? (seen ? ' yu-armed yu-in' : ' yu-armed') : '';
  return <div ref={ref} className={`${className} yu-play${state}`} style={style}>{children}</div>;
}
