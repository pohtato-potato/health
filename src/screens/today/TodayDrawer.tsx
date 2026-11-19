import { useEffect } from 'react';

/**
 * The moon Close the day above the tab bar (boards three and five): one wide button on the night-blue, with its
 * moon. It turns gold on a perfect day. Today in detail opens from the line under the heading.
 */
export function DrawerHandle({ closeLabel, gold, onCloseDay }: { closeLabel: 'Close the day' | 'Close the day · Plated' | 'Day closed'; gold?: boolean; onCloseDay: () => void }) {
  return (
    <div className="td-handle" data-section="handle">
      <button type="button" className={`td-moonbtn${gold ? ' gold' : ''}`} onClick={onCloseDay}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.5 15.5 A7.5 7.5 0 1 1 9.5 4.5 A6 6 0 0 0 17.5 15.5 Z" /></svg>
        {closeLabel}
      </button>
    </div>
  );
}

/** The drawer: the full voice line, the body log, the protein gap, and Close the day. */
export function TodayDrawer({ voice, body, protein, dayClosed, onBody, onAddGap, onCloseDay, onClose }: { voice: string; body: string; protein: { text: string; foods: string }; dayClosed: boolean; onBody: () => void; onAddGap: () => void; onCloseDay: () => void; onClose: () => void }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div className="td-scrim" onClick={onClose}>
      <div className="td-drawer" role="dialog" aria-label="Today in detail" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="td-grab" aria-label="Close" onClick={onClose}>
          <i aria-hidden="true" />
        </button>
        <p className="td-drawer-voice">{voice}</p>
        <div className="td-dgrid">
          <button type="button" className="td-dtile" onClick={onBody}>
            <b>Body</b>
            <span>Body log</span>
            <small>{body}</small>
          </button>
          <button type="button" className="td-dtile" onClick={onAddGap} disabled={!protein.foods}>
            <b>{protein.text.split(' ')[0]}</b>
            <span>{protein.text.split(' ').slice(1).join(' ')}</span>
            <small>{protein.foods ? `${protein.foods} · tap to add` : 'Nothing to add right now.'}</small>
          </button>
        </div>
        <button type="button" className="k-act wide" onClick={onCloseDay}>
          {dayClosed ? 'Change the closed day' : 'Close the day'}
        </button>
      </div>
    </div>
  );
}
