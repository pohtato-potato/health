import type { ReactNode } from 'react';

/**
 * The walk at the top of Today: the Walk tab's painted scene, cropped short, running edge to edge into the page; the
 * caption sits on a dark band, and on an arrival day the city's passport stamp sits on the scene. Tap to open the Walk tab.
 */
export function WalkTop({ caption, scene, stamp, onOpen }: { caption: [string, string, string]; scene: ReactNode; stamp?: ReactNode; onOpen: () => void }) {
  const [line, title, next] = caption;
  return (
    <button type="button" className="td-walk" data-section="walk" onClick={onOpen} aria-label={`${[line, title, next].filter(Boolean).map((t) => t.replace(/\.$/, '')).join('. ')}. Open the Walk tab`}>
      {scene}
      {stamp && <span className="td-walk-stamp">{stamp}</span>}
      <span className="td-walk-cap" aria-hidden="true">
        <span className="td-walk-line">{line}</span>
        <span className="td-walk-near">{title}</span>
        {next && <span className="td-walk-next">{next}</span>}
      </span>
    </button>
  );
}
