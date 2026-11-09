// Tap any card to see it full screen (owner, 9 Nov). The card sits large and centred on a dark aurora; it tilts with
// the phone (deviceorientation, asking iOS first) and with a drag, so the glass facets, foil and glare catch the light
// as the round-seven TILT pins drew it. Drag to rotate, pinch or double tap to zoom, tap to flip to the back, swipe
// down or the close button to leave. The face keeps no text; the words live on the back.
import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent as RKeyboardEvent, type PointerEvent as RPointerEvent, type ReactNode, type CSSProperties } from 'react';
import '../styles/card-viewer.css';

export interface CardView {
  /** The card face, drawn at full size: no text on it. */
  face: ReactNode;
  /** The back: name, tier and step, rating and history; or the fact and set. */
  back: ReactNode;
  /** What a screen reader hears for the card. */
  label: string;
}

let current: CardView | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
export function openCard(v: CardView) { current = v; emit(); }
export function closeCard() { current = null; emit(); }
const subscribe = (f: () => void) => { subs.add(f); return () => subs.delete(f); };
export const useOpenCard = () => useSyncExternalStore(subscribe, () => current, () => null);

/** Wraps a card so a tap opens it full screen. Keyboard and screen reader friendly; the card itself is the target. */
export function Viewable({ view, children, className = '', style }: { view: () => CardView; children: ReactNode; className?: string; style?: CSSProperties }) {
  const open = (e: { stopPropagation: () => void }) => { e.stopPropagation(); openCard(view()); };
  return (
    <div role="button" tabIndex={0} className={`cv-open ${className}`.trim()} style={style} aria-label={`${view().label}. Open full screen`} onClick={open} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(e); } }}>
      {children}
    </div>
  );
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
type Pt = { x: number; y: number };
type Perm = 'ask' | 'on' | 'off';
interface IOSOrientation { requestPermission?: () => Promise<'granted' | 'denied'> }

/** The viewer itself, mounted once at the app's root. */
export function CardViewerHost() {
  const v = useOpenCard();
  if (!v) return null;
  return <Viewer v={v} />;
}

function Viewer({ v }: { v: CardView }) {
  const [drag, setDrag] = useState<Pt>({ x: 0, y: 0 });
  const [orient, setOrient] = useState<Pt>({ x: 0, y: 0 });
  const [flipped, setFlipped] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [held, setHeld] = useState(false);
  const [perm, setPerm] = useState<Perm>(() => (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window && typeof (DeviceOrientationEvent as unknown as IOSOrientation).requestPermission === 'function' ? 'ask' : 'on'));
  const pts = useRef(new Map<number, Pt>());
  const g = useRef({ start: { x: 0, y: 0 }, last: { x: 0, y: 0 }, t0: 0, moved: 0, pinch0: 0, zoom0: 1, lastTap: 0, flipTimer: 0 });
  const card = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const zero = useRef<Pt | null>(null);

  // The phone's tilt: lean it and the light moves. Relative to how you held it when the card opened.
  useEffect(() => {
    if (perm !== 'on') return;
    const on = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      if (!zero.current) zero.current = { x: e.beta, y: e.gamma };
      setOrient({ x: clamp(-(e.beta - zero.current.x) * 0.9, -28, 28), y: clamp((e.gamma - zero.current.y) * 0.9, -28, 28) });
    };
    window.addEventListener('deviceorientation', on);
    return () => window.removeEventListener('deviceorientation', on);
  }, [perm]);

  useEffect(() => {
    close.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; window.clearTimeout(g.current.flipTimer); };
  }, []);

  const rx = clamp(orient.x + drag.x, -40, 40);
  const ry = orient.y + drag.y;
  // The glare and parallax read these, the same variables the small tilting cards use.
  useEffect(() => {
    const k = card.current?.querySelector<HTMLElement>('.k6, .cv-glass');
    if (!k) return;
    const px = clamp(Math.sin((ry * Math.PI) / 180) * 1.6, -1, 1), py = clamp(-rx / 30, -1, 1);
    k.style.setProperty('--px', px.toFixed(3));
    k.style.setProperty('--py', py.toFixed(3));
    k.style.setProperty('--mx', `${((px + 1) * 50).toFixed(1)}%`);
    k.style.setProperty('--my', `${((py + 1) * 50).toFixed(1)}%`);
  }, [rx, ry]);

  const askTilt = async () => {
    try {
      const r = await (DeviceOrientationEvent as unknown as IOSOrientation).requestPermission!();
      setPerm(r === 'granted' ? 'on' : 'off');
    } catch {
      setPerm('off');
    }
  };

  const down = (e: RPointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const s = g.current;
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()];
      s.pinch0 = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      s.zoom0 = zoom;
    } else {
      s.start = { x: e.clientX, y: e.clientY };
      s.last = s.start;
      s.t0 = performance.now();
      s.moved = 0;
    }
    setHeld(true);
  };
  const move = (e: RPointerEvent) => {
    if (!pts.current.has(e.pointerId)) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const s = g.current;
    if (pts.current.size >= 2) {
      const [a, b] = [...pts.current.values()];
      setZoom(clamp((s.zoom0 * Math.hypot(a.x - b.x, a.y - b.y)) / s.pinch0, 1, 3));
      s.moved = 99;
      return;
    }
    const dx = e.clientX - s.last.x, dy = e.clientY - s.last.y;
    s.last = { x: e.clientX, y: e.clientY };
    s.moved = Math.max(s.moved, Math.hypot(e.clientX - s.start.x, e.clientY - s.start.y));
    setDrag((d) => ({ x: clamp(d.x - dy * 0.45, -40, 40), y: d.y + dx * 0.6 }));
  };
  const up = (e: RPointerEvent) => {
    const wasPinch = pts.current.size >= 2;
    pts.current.delete(e.pointerId);
    if (pts.current.size) return;
    setHeld(false);
    const s = g.current;
    const dx = e.clientX - s.start.x, dy = e.clientY - s.start.y;
    // Swipe down, not zoomed in: leave.
    if (!wasPinch && zoom === 1 && dy > 110 && Math.abs(dx) < 80) { closeCard(); return; }
    // The light settles back; the card keeps the side it shows.
    setDrag({ x: 0, y: 0 });
    if (wasPinch || s.moved > 10 || performance.now() - s.t0 > 400) return;
    const now = performance.now();
    if (now - s.lastTap < 300) {
      window.clearTimeout(s.flipTimer);
      s.lastTap = 0;
      setZoom((z) => (z > 1 ? 1 : 2));
      return;
    }
    s.lastTap = now;
    s.flipTimer = window.setTimeout(() => setFlipped((f) => !f), 300);
  };
  const key = (e: RKeyboardEvent) => {
    if (e.key === 'Escape') closeCard();
    else if (e.key === 'Enter' || e.key === ' ') { if (e.target === e.currentTarget) { e.preventDefault(); setFlipped((f) => !f); } }
    else if (e.key === '+' || e.key === '=') setZoom((z) => clamp(z + 0.5, 1, 3));
    else if (e.key === '-') setZoom((z) => clamp(z - 0.5, 1, 3));
    else if (e.key === 'ArrowLeft') setDrag((d) => ({ ...d, y: d.y - 15 }));
    else if (e.key === 'ArrowRight') setDrag((d) => ({ ...d, y: d.y + 15 }));
  };

  return (
    <div className="cv" role="dialog" aria-modal="true" aria-label={`${v.label}, full screen`} onKeyDown={key}>
      <div className="cv-sky" aria-hidden="true"><i className="a" /><i className="b" /><i className="c" /></div>
      <button ref={close} type="button" className="cv-close" aria-label="Close" onClick={closeCard}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 L18 18 M18 6 L6 18" /></svg>
      </button>
      <div
        className={`cv-stage${held ? ' held' : ''}`}
        tabIndex={0}
        aria-label={`${v.label}. ${flipped ? 'Showing the back' : 'Showing the front'}. Tap to flip, drag to turn, pinch to zoom.`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <div ref={card} className="cv-card tilt8" style={{ transform: `scale(${zoom}) rotateX(${rx}deg) rotateY(${ry + (flipped ? 180 : 0)}deg)` }}>
          <div className="cv-face" aria-hidden={flipped}>{v.face}</div>
          <div className="cv-back" aria-hidden={!flipped}>{v.back}</div>
        </div>
      </div>
      <p className="cv-hint">
        {perm === 'ask' ? <button type="button" className="cv-tiltbtn" onClick={() => void askTilt()}>Tilt with your phone</button> : null}
        <span>Tap to flip · drag to turn · pinch or double tap to zoom · swipe down to close</span>
      </p>
    </div>
  );
}

/** A plain glass card for things that aren't players (album cards, loans, seals, staff): the same facets, its own emblem. */
export function GlassCard({ ink, children, tier = 'gold' }: { ink: string; children: ReactNode; tier?: 'bronze' | 'silver' | 'gold' | 'prism' | 'icon' | 'legend' }) {
  return (
    <div className={`cv-glass t-${tier}`} style={{ ['--ink' as string]: ink }}>
      <span className="cv-glass-facets" aria-hidden="true" />
      <span className="cv-glass-emblem" aria-hidden="true">{children}</span>
      <span className="gla8" />
    </div>
  );
}

/** A faceted gem, the default emblem for a glass card. */
export function Gem() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path d="M50 8 L86 36 L50 92 L14 36 Z" fill="color-mix(in srgb, var(--ink) 55%, #fff)" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M14 36 H86 M50 8 L34 36 L50 92 L66 36 Z" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

/** A shield, for era seals and staff. */
export function Crest() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path d="M50 6 L88 20 V50 C88 72 72 86 50 94 C28 86 12 72 12 50 V20 Z" fill="color-mix(in srgb, var(--ink) 50%, #120e26)" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
      <path d="M50 22 L74 31 V50 C74 64 64 73 50 78 C36 73 26 64 26 50 V31 Z" fill="none" stroke="var(--ink)" strokeWidth="3" />
      <circle cx="50" cy="50" r="9" fill="#fff" />
    </svg>
  );
}

/** A plain back: a kicker, a title and lines of words. */
export function SimpleBack({ kicker, title, lines }: { kicker: string; title: string; lines: (string | undefined | false)[] }) {
  return (
    <>
      <span className="cv-k">{kicker}</span>
      <h2>{title}</h2>
      {lines.filter(Boolean).map((l, i) => <p key={i} style={{ margin: 0 }}>{l}</p>)}
    </>
  );
}
