export interface Label {
  key: string;
  at: [number, number];
  text: string;
  size: number;
  cls: string;
  dx: number;
  dy: number;
  anchor: 'start' | 'end' | 'middle';
}

/**
 * Keeps labels from colliding: in priority order, each label tries its own side and the other at a few heights; one that still overlaps a label already placed, or would leave the frame, is left out (its dot or mark stays). Sizes are screen
 * pixels. The map page lists every state walked into in words as well, so no name depends on fitting.
 */
export function placeLabels(labels: Label[], toScreen: (p: [number, number]) => [number, number], frame?: [number, number]): Label[] {
  const placed: { l: Label; box: [number, number, number, number] }[] = [];
  const boxOf = (l: Label): [number, number, number, number] => {
    const [x, y] = toScreen(l.at);
    const w = l.text.length * l.size * 0.55;
    const x0 = x + l.dx - (l.anchor === 'end' ? w : l.anchor === 'middle' ? w / 2 : 0);
    const y0 = y + l.dy - l.size;
    return [x0 - 2, y0 - 2, x0 + w + 2, y0 + l.size * 1.2 + 2];
  };
  const inside = (b: [number, number, number, number]) => !frame || (b[0] >= 0 && b[1] >= 0 && b[2] <= frame[0] && b[3] <= frame[1]);
  const clear = (b: [number, number, number, number]) => inside(b) && placed.every(({ box: o }) => b[2] <= o[0] || o[2] <= b[0] || b[3] <= o[1] || o[3] <= b[1]);
  for (const l of labels) {
    const flip = { ...l, dx: -l.dx, anchor: l.anchor === 'start' ? ('end' as const) : ('start' as const) };
    const tries = l.anchor === 'middle' ? [0, 18, -16, 34, -32].map((d) => ({ ...l, dy: l.dy + d })) : [0, 16, -16].flatMap((d) => [{ ...l, dy: l.dy + d }, { ...flip, dy: flip.dy + d }]);
    for (const t of tries) {
      const b = boxOf(t);
      if (clear(b)) {
        placed.push({ l: t, box: b });
        break;
      }
    }
  }
  return placed.map((p) => p.l);
}
