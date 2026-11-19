import { endStatus, startStatus } from '../db/actions';
import type { Status } from '../domain/types';

export const STATUSES: { id: Status; label: string }[] = [
  { id: 'sick', label: 'Sick' },
  { id: 'injured', label: 'Injured' },
  { id: 'travelling', label: 'Travelling' },
  { id: 'break', label: 'Break' },
];

/**
 * One tap switches a status on (until switched off) or off. `fine` is the morning's "How are you" (board 6 `m6-also`):
 * no status reads "Fine" and comes first; each choice carries its own colour as well as its name.
 */
export function StatusRow({ today, current, fine }: { today: string; current?: Status; fine?: boolean }) {
  const none = (
    <button key="none" type="button" role="radio" aria-checked={!current} className={`chip sm st-fine${!current ? ' on' : ''}`} onClick={() => void endStatus(today)}>
      {fine ? 'Fine' : 'None'}
    </button>
  );
  return (
    <div className="status-row" role="radiogroup" aria-label={fine ? 'How are you' : 'Status'}>
      {fine && none}
      {STATUSES.map((st) => (
        <button key={st.id} type="button" role="radio" aria-checked={current === st.id} className={`chip sm st-${st.id}${current === st.id ? ' on' : ''}`} onClick={() => void (current === st.id ? endStatus(today) : startStatus(today, st.id))}>
          {st.label}
        </button>
      ))}
      {!fine && none}
    </div>
  );
}
