import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react';
import { createPortal } from 'react-dom';
import { closeSheet } from '../router';
import { Icon } from './Icon';

/**
 * A bottom sheet over the current page. Closing it is a real Back, so the
 * Android back gesture closes sheets rather than leaving the app.
 */
export function Sheet({
  title,
  sub,
  children,
  tall,
  onClose = closeSheet,
  head,
}: {
  title?: ReactNode;
  sub?: ReactNode;
  children: ReactNode;
  tall?: boolean;
  onClose?: () => void;
  head?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);
  // Taps are ignored until the sheet has finished sliding in, so a tap meant for the page below can't land on a row.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 350);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Pull the header down to dismiss.
  const onTouchStart = (e: TouchEvent) => {
    drag.current = { y: e.touches[0].clientY, dy: 0 };
  };
  const onTouchMove = (e: TouchEvent) => {
    if (!drag.current || !ref.current) return;
    const dy = Math.max(0, e.touches[0].clientY - drag.current.y);
    drag.current.dy = dy;
    ref.current.style.transform = `translate(-50%, ${dy}px)`;
  };
  const onTouchEnd = () => {
    if (!drag.current || !ref.current) return;
    const { dy } = drag.current;
    drag.current = null;
    if (dy > 90) onClose();
    else {
      ref.current.style.transition = 'transform .2s';
      ref.current.style.transform = '';
      window.setTimeout(() => ref.current && (ref.current.style.transition = ''), 220);
    }
  };

  return createPortal(
    <>
      <div className="scrim" onClick={onClose} />
      <div ref={ref} className={`sheet${tall ? ' tall' : ''}`} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
        <div className="sheet-head" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <div className="grabber" />
          {(title || head) && (
            <div className="row">
              {head ?? (
                <div className="col gap2">
                  <div className="h2">{title}</div>
                  {sub && <div className="t13 q">{sub}</div>}
                </div>
              )}
              <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
                <Icon name="close" size={20} stroke={1.8} />
              </button>
            </div>
          )}
        </div>
        <div className="sheet-body" style={ready ? undefined : { pointerEvents: 'none' }} onAnimationEnd={() => setReady(true)}>{children}</div>
      </div>
    </>,
    document.body,
  );
}
