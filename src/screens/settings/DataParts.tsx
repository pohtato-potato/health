import type { CSSProperties } from 'react';
import type { DayKey } from '../../domain/dates';
import { fmtDayMonth, fmtDayShort } from '../../domain/format';

/** The all-clear (board 23): a green disc pops in and its tick draws itself; the line says what was checked. */
export function AllClear() {
  return (
    <div className="dc-ok">
      <span className="dc-ck" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="#0b1022" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path className="dc-tick" d="M5 12l5 5 9-10" /></svg>
      </span>
      <b>Nothing looks off</b>
      <span>Empty days, double entries, odd weights and steps, open sessions and doses ticked twice all come up clear.</span>
    </div>
  );
}

const KINDS: Record<string, { word: string; c: string }> = {
  entries: { word: 'Food', c: '#c2b2ff' },
  days: { word: 'Day log', c: '#8fd8ff' },
  sets: { word: 'Training', c: '#ff9a76' },
  sessions: { word: 'Training', c: '#ffd36b' },
};
/** What kind of thing a change touched, in a word and a colour. */
export const editKind = (table: string) => KINDS[table] ?? { word: 'Data', c: '#5fe3a1' };

export interface EditRowData { id: number; table: string; verb: string; what: string; when: string; for?: DayKey }

/** One day's changes (board 23): each with a dot for its kind, the change in words, and Undo. */
export function EditDay({ day, rows, onUndo }: { day: DayKey; rows: EditRowData[]; onUndo: (id: number) => void }) {
  return (
    <section className="dh-day">
      <h2>{fmtDayShort(day)}</h2>
      {rows.map((r, k) => {
        const kind = editKind(r.table);
        return (
          <div key={r.id} className="dh-ed" style={{ '--c': kind.c, '--d': `${Math.min(k, 8) * 0.08}s` } as CSSProperties}>
            <i aria-hidden="true" />
            <span><b>{r.verb} {r.what}</b><small>{kind.word} · {r.for ? `for ${fmtDayMonth(r.for)}, ` : ''}{r.when}</small></span>
            <button type="button" aria-label={`Undo: ${r.verb} ${r.what}`} onClick={() => onUndo(r.id)}>Undo</button>
          </div>
        );
      })}
    </section>
  );
}
