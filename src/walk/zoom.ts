import { useRef, useState, type PointerEvent, type WheelEvent } from 'react';

/** A zoom and pan over an SVG: scale k, then shift by x, y (in viewBox units). */
export interface View {
  k: number;
  x: number;
  y: number;
}

const MIN = 1;
const MAX = 4;

/** Keep the map covering the frame: no blank space past its edges. */
export function clampView(v: View, w: number, h: number): View {
  const k = Math.min(MAX, Math.max(MIN, v.k));
  return { k, x: Math.min(0, Math.max(w - w * k, v.x)), y: Math.min(0, Math.max(h - h * k, v.y)) };
}

/** Zoom by a factor about a point (in viewBox units), so that point stays where it is. */
export function zoomAbout(v: View, factor: number, cx: number, cy: number, w: number, h: number): View {
  const k = Math.min(MAX, Math.max(MIN, v.k * factor));
  const r = k / v.k;
  return clampView({ k, x: cx - (cx - v.x) * r, y: cy - (cy - v.y) * r }, w, h);
}

/** Pinch and drag on an SVG, with a wheel on desktop. Taps still reach what is under them. */
export function useZoomPan(w: number, h: number) {
  const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 });
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(false);
  const toBox = (svg: SVGSVGElement, cx: number, cy: number) => {
    const r = svg.getBoundingClientRect();
    return { x: ((cx - r.left) / r.width) * w, y: ((cy - r.top) / r.height) * h };
  };
  const handlers = {
    onPointerDown: (e: PointerEvent<SVGSVGElement>) => {
      pts.current.set(e.pointerId, toBox(e.currentTarget, e.clientX, e.clientY));
      moved.current = false;
    },
    onPointerMove: (e: PointerEvent<SVGSVGElement>) => {
      const prev = pts.current.get(e.pointerId);
      if (!prev) return;
      const p = toBox(e.currentTarget, e.clientX, e.clientY);
      const others = [...pts.current.entries()].filter(([id]) => id !== e.pointerId).map(([, q]) => q);
      if (others.length === 1) {
        const o = others[0];
        const before = Math.hypot(prev.x - o.x, prev.y - o.y);
        const after = Math.hypot(p.x - o.x, p.y - o.y);
        if (before > 0) setView((v) => zoomAbout(v, after / before, (p.x + o.x) / 2, (p.y + o.y) / 2, w, h));
        moved.current = true;
      } else if (others.length === 0) {
        const dx = p.x - prev.x;
        const dy = p.y - prev.y;
        if (Math.abs(dx) + Math.abs(dy) > 1.5) moved.current = true;
        setView((v) => (v.k > 1 ? clampView({ ...v, x: v.x + dx, y: v.y + dy }, w, h) : v));
      }
      pts.current.set(e.pointerId, p);
    },
    onPointerUp: (e: PointerEvent<SVGSVGElement>) => void pts.current.delete(e.pointerId),
    onPointerCancel: (e: PointerEvent<SVGSVGElement>) => void pts.current.delete(e.pointerId),
    onWheel: (e: WheelEvent<SVGSVGElement>) => {
      const p = toBox(e.currentTarget, e.clientX, e.clientY);
      setView((v) => zoomAbout(v, e.deltaY < 0 ? 1.2 : 1 / 1.2, p.x, p.y, w, h));
    },
  };
  return {
    view,
    handlers,
    /** True when the last gesture was a drag or pinch, so it shouldn't count as a tap. */
    wasGesture: () => moved.current,
    zoom: (f: number) => setView((v) => zoomAbout(v, f, w / 2, h / 2, w, h)),
    reset: () => setView({ k: 1, x: 0, y: 0 }),
  };
}
