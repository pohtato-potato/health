import { useEffect } from 'react';

/** The pill above the tab bar: what the drawer holds, readable without opening it. */
export function DrawerHandle({ ready, protein, closeLabel, onOpen }: { ready: number | undefined; protein: string; closeLabel: 'Close the day' | 'Day closed'; onOpen: () => void }) {
  return (
    <button type="button" className="td-handle" data-section="handle" aria-label="Open today in detail" onClick={onOpen}>
      <i aria-hidden="true" />
      <span className="td-handle-row">
        <span>
          Ready <b className="tn">{ready ?? '—'}</b>
        </span>
        <span>{protein}</span>
        <span className="td-handle-close">{closeLabel}</span>
      </span>
    </button>
  );
}

/** The drawer: the full voice line, readiness, the protein gap, and Close the day. */
export function TodayDrawer({ voice, readiness, protein, dayClosed, onReadiness, onAddGap, onCloseDay, onClose }: { voice: string; readiness: { score?: number; reason?: string }; protein: { text: string; foods: string }; dayClosed: boolean; onReadiness: () => void; onAddGap: () => void; onCloseDay: () => void; onClose: () => void }) {
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
          <button type="button" className="td-dtile" onClick={onReadiness}>
            <b className="tn">{readiness.score ?? '—'}</b>
            <span>{readiness.score !== undefined ? 'Ready' : 'Log sleep'}</span>
            <small>{readiness.reason ?? 'The morning log’s sleep makes this a real score.'}</small>
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
