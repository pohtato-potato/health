import type { ReactNode } from 'react';

/** The walk at the top of Today: the scene runs edge to edge into the page; the caption sits on a dark band. Tap to open the Walk tab. */
export function WalkTop({ caption, scene, onOpen }: { caption: [string, string, string]; scene: ReactNode; onOpen: () => void }) {
  const [line, near, next] = caption;
  return (
    <button type="button" className="td-walk" data-section="walk" onClick={onOpen} aria-label={`${line}. ${near}. ${next}. Open the Walk tab`}>
      {scene}
      <span className="td-walk-cap" aria-hidden="true">
        <span className="td-walk-line">{line}</span>
        <span className="td-walk-near">{near}</span>
        <span className="td-walk-next">{next}</span>
      </span>
    </button>
  );
}
