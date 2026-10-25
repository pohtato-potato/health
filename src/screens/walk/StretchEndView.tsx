import type { Stretch } from '../../walk/content/types';

/** The half-screen note at a stretch's end: the one done, the one begun. */
export function StretchEndView({ done, next, onRead, onClose }: { done: Stretch; next?: Stretch; onRead: () => void; onClose: () => void }) {
  return (
    <div className="walk-end">
      <span className="walk-kind">Stretch done</span>
      <h2 className="walk-title">{done.name}, done</h2>
      <p className="walk-para">{done.plain}, {Math.round(done.toKm - done.fromKm)} km.</p>
      {next && (
        <p className="walk-para">
          Next: {next.name}, {next.plain}.
        </p>
      )}
      <div className="walk-end-btns">
        {next && (
          <button type="button" className="walk-primary" onClick={onRead}>
            Read about {next.name}
          </button>
        )}
        <button type="button" className="walk-ghost" onClick={onClose}>
          Back to the walk
        </button>
      </div>
    </div>
  );
}
