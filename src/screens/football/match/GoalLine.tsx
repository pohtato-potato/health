// The goal-line close-up: over the last third of the roll the pitch closes in on the ball so the edge call can be seen.
export const ZOOM = 2.7;

export function GoalLineCaption({ ok, decided, side }: { ok: boolean; decided: boolean; side: 'atk' | 'def' }) {
  const inShape = ok;
  const text = !decided ? 'On the line…' : side === 'atk' ? (inShape ? 'Over the line. Goal.' : 'Not over. So close.') : inShape ? 'Kept out, just.' : 'Over the line.';
  return <div className="fb-gl" role="status"><b>{text}</b></div>;
}
