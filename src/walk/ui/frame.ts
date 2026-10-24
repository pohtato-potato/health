import { useEffect, useRef, useState } from 'react';
import type { Region } from '../geo';

/**
 * A view box around a route: its bounding box with room for the land and the names, stretched to the shape it is
 * drawn in, so every route fills its card. `unit` is screen pixels per map unit at `px` wide.
 */
export function frameRoute(line: [number, number][], region: Region, px: [number, number], room: [number, number], minShare: number) {
  const [pw, ph] = px;
  const xs = line.map((p) => p[0]);
  const ys = line.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const span = Math.max(x1 - x0, y1 - y0, region.box[2] * minShare);
  let w = x1 - x0 + span * room[0];
  let h = y1 - y0 + span * room[1];
  if (w / h < pw / ph) w = h * (pw / ph);
  else h = w / (pw / ph);
  return { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h, unit: pw / w };
}

export const pathOf = (line: [number, number][]) => 'M' + line.map((p) => p.join(' ')).join(' L');

export const fmtKm = (n: number) => Math.round(n).toLocaleString('en-IN');

/**
 * The drawing's width on screen, so names keep their pixel size: the `width` given, else the measured width once
 * it's on screen, else the width it's designed for.
 */
export function useDrawnWidth(width: number | undefined, designed: number) {
  const [measured, setMeasured] = useState<number>();
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (width !== undefined || !el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => e.contentRect.width > 0 && setMeasured(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return [ref, width ?? measured ?? designed] as const;
}
