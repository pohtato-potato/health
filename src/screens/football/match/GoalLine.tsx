// The goal-line zoom: the pitch scales in on the landing spot so the edge call can be seen.
export const ZOOM = 3;
export const zoomTransform = (x: number, y: number) => `translate(${x} ${y}) scale(${ZOOM}) translate(${-x} ${-y})`;

export function GoalLineCaption({ ok, decided, side }: { ok: boolean; decided: boolean; side: 'atk' | 'def' }) {
  const inShape = ok;
  const text = !decided ? 'On the line…' : side === 'atk' ? (inShape ? 'Over the line. Goal.' : 'Not over. So close.') : inShape ? 'Kept out, just.' : 'Over the line.';
  return <div className="fb-gl" role="status"><b>{text}</b></div>;
}
