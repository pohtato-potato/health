import { useEffect } from 'react';

/**
 * The dock above the tab bar (Today AM, pinned): the protein still to go opens the drawer; the moon-coloured
 * Close the day button with its moon goes straight to Close the day. No + button: logging lives on the page.
 */
export function DrawerHandle({ protein, closeLabel, onOpen, onCloseDay }: { protein: string; closeLabel: 'Close the day' | 'Day closed'; onOpen: () => void; onCloseDay: () => void }) {
  return (
    <div className="td-handle" data-section="handle">
      <button type="button" className="td-handle-open" aria-label={`${protein}. Open today in detail`} onClick={onOpen}>
        <i aria-hidden="true" />
        <span>{protein}</span>
      </button>
      <button type="button" className="td-moonbtn" onClick={onCloseDay}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.5 15.5 A7.5 7.5 0 1 1 9.5 4.5 A6 6 0 0 0 17.5 15.5 Z" /><circle cx="18" cy="6" r="1" /><circle cx="20.5" cy="10" r=".7" /></svg>
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
        <button type="button" className="btn block lg" onClick={onCloseDay}>
          {dayClosed ? 'Change the closed day' : 'Close the day'}
        </button>
      </div>
    </div>
  );
}
